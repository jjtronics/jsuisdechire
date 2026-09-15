
from flask import Flask, render_template, request, jsonify, g, url_for, session, redirect, make_response, abort, send_from_directory
import sqlite3, os, time, datetime, json, hashlib, secrets, smtplib, ssl, imghdr, math, hmac, re
from functools import lru_cache, wraps
from pathlib import Path
from typing import Optional
from urllib.parse import urlsplit
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix
from email.message import EmailMessage
from email.utils import parseaddr

try:
    from authlib.integrations.flask_client import OAuth
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    OAuth = None

APP_NAME = "jsuisdechire"
DB_PATH = os.path.join(os.path.dirname(__file__), "data.sqlite")
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
configured_secret_key = os.getenv("SECRET_KEY")
if not configured_secret_key and os.getenv("FLASK_ENV") == "production":
    raise RuntimeError("SECRET_KEY doit être définie en production.")
app.secret_key = configured_secret_key or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("FLASK_ENV") == "production",
)

CSRF_SESSION_KEY = "csrf_token"
STATE_CHANGING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
SENSITIVE_SETTING_KEYS = frozenset({
    "smtp_host",
    "smtp_port",
    "smtp_username",
    "smtp_password",
    "smtp_sender",
    "smtp_security",
})

MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_AVATAR_SIZE_LABEL = f"{MAX_AVATAR_BYTES // (1024 * 1024)} Mo"
ALLOWED_AVATAR_FORMATS = {"png": ".png", "jpeg": ".jpg"}
UPLOAD_SUBDIR = "uploads"
STATIC_ROOT = Path(app.static_folder or Path(__file__).parent / "static")
AVATAR_UPLOAD_FOLDER = STATIC_ROOT / UPLOAD_SUBDIR
AVATAR_UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
GOOGLE_ANALYTICS_ID_PATTERN = re.compile(r"G-[A-Za-z0-9]+")


def get_google_analytics_id() -> str:
    """Return a safe GA4 measurement ID, or disable analytics when unset/invalid."""
    candidate = os.getenv("GOOGLE_ANALYTICS_ID", "").strip()
    return candidate if GOOGLE_ANALYTICS_ID_PATTERN.fullmatch(candidate) else ""

google_oauth = None
if OAuth is not None:
    oauth = OAuth(app)
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if google_client_id and google_client_secret:
        google_oauth = oauth.register(
            name="google",
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
            authorize_params={"prompt": "select_account"},
        )
else:
    oauth = None

@lru_cache
def get_asset_version() -> str:
    env_version = os.getenv("ASSET_VERSION")
    if env_version:
        return env_version

    static_folder = Path(app.static_folder or Path(__file__).parent / "static")
    template_folder = Path(app.template_folder or Path(__file__).parent / "templates")
    hasher = hashlib.sha256()

    def update_from_folder(prefix: bytes, folder: Path) -> None:
        if not folder.exists():
            return

        for path in sorted(folder.rglob("*")):
            if not path.is_file():
                continue

            relative_path = path.relative_to(folder).as_posix().encode("utf-8")
            hasher.update(prefix)
            hasher.update(relative_path)

            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(8192), b""):
                    hasher.update(chunk)

    update_from_folder(b"static\0", static_folder)
    update_from_folder(b"templates\0", template_folder)

    return hasher.hexdigest()


def asset_url(path: str) -> str:
    return url_for("static", filename=path, v=get_asset_version())


@app.context_processor
def inject_asset_helpers():
    version = get_asset_version()
    return {"asset_url": asset_url, "asset_version": version}


assert get_asset_version(), "Asset version must not be empty"


@app.context_processor
def inject_app_settings():
    settings = get_settings()
    if request.path.startswith("/admin") and is_admin_authenticated():
        return {"app_settings": get_admin_client_settings(settings)}
    return {"app_settings": get_public_settings(settings)}


def get_csrf_token() -> str:
    token = session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token
    return token


@app.context_processor
def inject_csrf_token():
    return {"csrf_token": get_csrf_token()}


@app.before_request
def protect_state_changing_requests():
    if request.method not in STATE_CHANGING_METHODS:
        return None

    expected = session.get(CSRF_SESSION_KEY)
    supplied = request.headers.get("X-CSRFToken") or request.form.get("csrf_token")
    if expected and supplied and hmac.compare_digest(str(expected), str(supplied)):
        return None

    abort(400, description="Jeton CSRF invalide.")


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)",
    )
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; "
        "font-src 'self' https: data:; connect-src 'self' https://accounts.google.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com; worker-src 'self'; manifest-src 'self'; form-action 'self';",
    )
    if request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    # Every rendered page can contain session-specific navigation, account
    # data, CSRF material, or settings. Do not let a browser/proxy reuse an
    # anonymous page just after login (or an authenticated one after logout).
    is_html_page = response.mimetype == "text/html"
    sensitive_page = request.path in {"/login", "/register", "/forgot-password", "/profile", "/admin/login"}
    authenticated = is_admin_authenticated() or get_current_user() is not None
    if is_html_page or sensitive_page or authenticated or request.path.startswith("/admin") or request.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers.add("Vary", "Cookie")
    return response


@app.context_processor
def inject_auth_context():
    user = get_current_user()
    payload = None
    if user is not None:
        avatar_url = None
        avatar_path = user.get("avatar_path") if isinstance(user, dict) else user["avatar_path"]
        if avatar_path:
            avatar_url = asset_url(avatar_path)
        payload = {
            "id": int(user["id"]),
            "login": user["login"],
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
            "avatar_path": avatar_path,
            "avatar_url": avatar_url,
        }
    return {
        "current_user": user,
        "current_user_payload": payload,
        "google_login_enabled": is_google_login_available(),
        "google_analytics_id": get_google_analytics_id() if not request.path.startswith("/admin") else "",
    }


@app.route("/sw.js")
def service_worker():
    response = make_response(render_template("sw.js"))
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

DEFAULT_SETTINGS = {
    "rxn_trials": 5,
    "rxn_wait_min_ms": 1000,
    "rxn_wait_range_ms": 2500,
    "rxn_false_penalty_min_ms": 1000,
    "rxn_false_penalty_range_ms": 500,
    "rxn_median_best_ms": 250,
    "rxn_median_worst_ms": 500,
    "str_rounds": 8,
    "str_acc_weight": 0.6,
    "str_speed_weight": 0.4,
    "str_speed_best_ms": 700,
    "str_speed_worst_ms": 1400,
    "prs_timeSpeed": 0.75,
    "prs_duration_ms": 10000,
    "prs_captureRadius": 36,
    "prs_target_diameter": 68,
    "prs_jitterAmp": 0.05,
    "prs_max_attempts": 10,
    "rfl_attempts": 5,
    "rfl_shuffle_moves": 5,
    "rfl_velocity_scale": 4.8,
    "rfl_gravity": 1800,
    "rfl_cup_speed_min": 70,
    "rfl_cup_speed_max": 160,
    "rfl_success_weight": 0.7,
    "rfl_accuracy_weight": 0.3,
    "rfl_accuracy_tolerance_px": 60,
    "pong_attempts": 5,
    "pong_velocity_scale": 4.8,
    "pong_gravity": 1800,
    "pong_cup_speed": 160,
    "pong_accuracy_tolerance_px": 60,
    "drv_lane_count": 3,
    "drv_duration_ms": 45000,
    "drv_initial_speed_px_s": 220,
    "drv_speed_growth_per_s": 3.2,
    "drv_spawn_interval_ms": 900,
    "drv_spawn_interval_decay_per_s": 12,
    "drv_spawn_jitter_ms": 260,
    "drv_lane_change_chance": 0.22,
    "drv_lane_change_warning_ms": 900,
    "drv_lane_change_duration_ms": 800,
    "drv_collision_penalty": 18,
    "drv_max_collisions": 6,
    "drv_time_weight": 0.6,
    "drv_avoid_weight": 0.4,
    "bal_mode": "lin",
    "bal_duration_ms": 8000,
    "bal_low_good": 0.02,
    "bal_high_bad": 0.10,
    "bal_lin_rel_tol": 0.15,
    "bal_cheat_detection_enabled": True,
    "bal_cheat_std_threshold": 0.006,
    "bal_cheat_min_events": 25,
    "bal_cheat_avatar_path": "icons/clown-avatar.svg",
    "mem_pairs": 8,
    "mem_initial_reveal_ms": 1500,
    "mem_mismatch_hide_ms": 900,
    "mem_accuracy_weight": 0.6,
    "mem_speed_weight": 0.4,
    "mem_time_best_ms": 45000,
    "mem_time_worst_ms": 120000,
    "ice_duration_ms": 20000,
    "ice_spawn_interval_ms": 720,
    "ice_spawn_interval_decay_per_s": 12,
    "ice_fall_speed_px_s": 150,
    "ice_speed_growth_per_s": 7,
    "ice_max_objects": 12,
    "ice_combo_window_ms": 1100,
    "tilt_duration_ms": 30000,
    "tilt_sensitivity": 1.0,
    "tilt_target_speed_px_s": 160,
    "tilt_spawn_interval_ms": 900,
    "tilt_spawn_decay_per_s": 14,
    "tilt_tolerance_px": 26,
    "tilt_max_collisions": 5,
    "dino_duration_ms": 30000,
    "dino_initial_speed_px_s": 310,
    "dino_speed_growth_per_s": 7,
    "dino_spawn_interval_ms": 1450,
    "dino_spawn_decay_per_s": 18,
    "dino_jump_impulse_ms": 720,
    "dino_jump_threshold": 1.35,
    "session_total_games": 10,
    "session_user_select_enabled": False,
    "session_feedback_enabled": True,
    "player_score_deletions_per_day": 3,
    "game_rxn_enabled": True,
    "game_str_enabled": True,
    "game_prs_enabled": True,
    "game_bal_enabled": True,
    "game_mem_enabled": True,
    "game_rfl_enabled": True,
    "game_pong_enabled": True,
    "game_drv_enabled": True,
    "game_ice_enabled": True,
    "game_tilt_enabled": True,
    "game_dino_enabled": False,
    "nickname_max_length": 32,
    "smtp_host": "",
    "smtp_port": 587,
    "smtp_username": "",
    "smtp_password": "",
    "smtp_sender": "",
    "smtp_security": "starttls",
}

ALLOWED_SETTING_KEYS = frozenset(DEFAULT_SETTINGS.keys())

SETTING_RANGES = {
    "rxn_trials": (1, 50, int),
    "rxn_wait_min_ms": (0, 60000, int),
    "rxn_wait_range_ms": (0, 120000, int),
    "rxn_false_penalty_min_ms": (0, 120000, int),
    "rxn_false_penalty_range_ms": (0, 120000, int),
    "rxn_median_best_ms": (1, 120000, int),
    "rxn_median_worst_ms": (1, 120000, int),
    "str_rounds": (1, 100, int),
    "str_acc_weight": (0, 1, float),
    "str_speed_weight": (0, 1, float),
    "str_speed_best_ms": (1, 120000, int),
    "str_speed_worst_ms": (1, 120000, int),
    "prs_timeSpeed": (0.1, 5, float),
    "prs_duration_ms": (2000, 30000, int),
    "prs_captureRadius": (8, 200, float),
    "prs_target_diameter": (24, 140, int),
    "prs_jitterAmp": (0, 0.3, float),
    "prs_max_attempts": (1, 50, int),
    "bal_duration_ms": (3000, 30000, int),
    "bal_low_good": (0.001, 2, float),
    "bal_high_bad": (0.002, 3, float),
    "bal_lin_rel_tol": (0, 10, float),
    "bal_cheat_std_threshold": (0, 2, float),
    "bal_cheat_min_events": (0, 100000, int),
    "mem_pairs": (2, 12, int),
    "mem_initial_reveal_ms": (300, 6000, int),
    "mem_mismatch_hide_ms": (150, 4000, int),
    "mem_accuracy_weight": (0, 1, float),
    "mem_speed_weight": (0, 1, float),
    "mem_time_best_ms": (5000, 180000, int),
    "mem_time_worst_ms": (6000, 300000, int),
    "rfl_attempts": (1, 20, int),
    "rfl_shuffle_moves": (3, 12, int),
    "rfl_velocity_scale": (0.5, 20, float),
    "rfl_gravity": (200, 4000, float),
    "rfl_cup_speed_min": (10, 400, float),
    "rfl_cup_speed_max": (20, 500, float),
    "rfl_success_weight": (0, 1, float),
    "rfl_accuracy_weight": (0, 1, float),
    "rfl_accuracy_tolerance_px": (10, 300, float),
    "pong_attempts": (1, 20, int),
    "pong_velocity_scale": (0.5, 20, float),
    "pong_gravity": (200, 4000, float),
    "pong_cup_speed": (20, 500, float),
    "pong_accuracy_tolerance_px": (10, 300, float),
    "drv_lane_count": (2, 5, int),
    "drv_duration_ms": (5000, 120000, int),
    "drv_initial_speed_px_s": (60, 500, float),
    "drv_speed_growth_per_s": (0, 20, float),
    "drv_spawn_interval_ms": (200, 4000, int),
    "drv_spawn_interval_decay_per_s": (0, 100, float),
    "drv_spawn_jitter_ms": (0, 3000, int),
    "drv_lane_change_chance": (0, 1, float),
    "drv_lane_change_warning_ms": (300, 2000, int),
    "drv_lane_change_duration_ms": (300, 2000, int),
    "drv_collision_penalty": (0, 50, float),
    "drv_max_collisions": (1, 20, int),
    "drv_time_weight": (0, 1, float),
    "drv_avoid_weight": (0, 1, float),
    "ice_duration_ms": (5000, 60000, int),
    "ice_spawn_interval_ms": (180, 3000, int),
    "ice_spawn_interval_decay_per_s": (0, 80, float),
    "ice_fall_speed_px_s": (60, 500, float),
    "ice_speed_growth_per_s": (0, 40, float),
    "ice_max_objects": (4, 30, int),
    "ice_combo_window_ms": (300, 3000, int),
    "tilt_duration_ms": (10000, 90000, int),
    "tilt_sensitivity": (0.3, 3, float),
    "tilt_target_speed_px_s": (60, 500, float),
    "tilt_spawn_interval_ms": (250, 3000, int),
    "tilt_spawn_decay_per_s": (0, 80, float),
    "tilt_tolerance_px": (10, 100, float),
    "tilt_max_collisions": (1, 20, int),
    "dino_duration_ms": (10000, 90000, int),
    "dino_initial_speed_px_s": (120, 600, float),
    "dino_speed_growth_per_s": (0, 40, float),
    "dino_spawn_interval_ms": (500, 4000, int),
    "dino_spawn_decay_per_s": (0, 100, float),
    "dino_jump_impulse_ms": (300, 1400, int),
    "dino_jump_threshold": (0.5, 4, float),
    "session_total_games": (1, 11, int),
    "player_score_deletions_per_day": (0, 100, int),
    "nickname_max_length": (1, 128, int),
    "smtp_port": (1, 65535, int),
}
BOOLEAN_SETTING_KEYS = frozenset({
    "session_user_select_enabled",
    "session_feedback_enabled",
    "game_rxn_enabled",
    "game_str_enabled",
    "game_prs_enabled",
    "game_bal_enabled",
    "game_mem_enabled",
    "game_rfl_enabled",
    "game_pong_enabled",
    "game_drv_enabled",
    "game_ice_enabled",
    "game_tilt_enabled",
    "game_dino_enabled",
    "bal_cheat_detection_enabled",
})


def validate_settings(settings: dict) -> list[str]:
    errors = []
    for key, (minimum, maximum, expected_type) in SETTING_RANGES.items():
        if key not in settings:
            continue
        value = settings[key]
        if isinstance(value, bool):
            errors.append(key)
            continue
        if not isinstance(value, (int, float)):
            errors.append(key)
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            errors.append(key)
            continue
        if not math.isfinite(number) or not minimum <= number <= maximum:
            errors.append(key)
            continue
        if expected_type is int and number != int(number):
            errors.append(key)

    for key in BOOLEAN_SETTING_KEYS:
        if key in settings and not isinstance(settings[key], bool):
            errors.append(key)

    weight_groups = (
        ("str_acc_weight", "str_speed_weight"),
        ("mem_accuracy_weight", "mem_speed_weight"),
        ("rfl_success_weight", "rfl_accuracy_weight"),
        ("drv_time_weight", "drv_avoid_weight"),
    )
    for first, second in weight_groups:
        if first in settings and second in settings:
            try:
                if not math.isclose(float(settings[first]) + float(settings[second]), 1.0, abs_tol=0.001):
                    errors.extend((first, second))
            except (TypeError, ValueError):
                errors.extend((first, second))

    ordered_pairs = (
        ("rxn_median_best_ms", "rxn_median_worst_ms"),
        ("str_speed_best_ms", "str_speed_worst_ms"),
        ("mem_time_best_ms", "mem_time_worst_ms"),
        ("bal_low_good", "bal_high_bad"),
        ("rfl_cup_speed_min", "rfl_cup_speed_max"),
    )
    for lower, upper in ordered_pairs:
        if lower in settings and upper in settings:
            try:
                if float(settings[lower]) >= float(settings[upper]):
                    errors.extend((lower, upper))
            except (TypeError, ValueError):
                errors.extend((lower, upper))

    if settings.get("bal_mode") not in {None, "mag", "lin"}:
        errors.append("bal_mode")
    if settings.get("smtp_security") not in {None, "none", "starttls", "ssl"}:
        errors.append("smtp_security")

    return list(dict.fromkeys(errors))

DEFAULT_ADMIN_LOGIN = "admin"
# Never ship a usable admin password. A fresh installation must be configured
# explicitly before the admin area can be used.
DEFAULT_ADMIN_PASSWORD_HASH = None
ADMIN_SESSION_KEY = "admin_authenticated"
ADMIN_AUTH_VERSION_SESSION_KEY = "admin_auth_version"
ADMIN_AUTH_VERSION_SETTING_KEY = "admin_auth_version"
USER_SESSION_KEY = "user_authenticated_id"
USER_AUTH_VERSION_SESSION_KEY = "user_auth_version"
GOOGLE_PENDING_SESSION_KEY = "pending_google_signup"
DEFAULT_USER_ROLE = "player"
PASSWORD_RESET_TOKEN_TTL = 3600
SMTP_SECURITY_MODES = {"none", "starttls", "ssl"}
SCORE_SUBMIT_RATE_LIMIT = 6
SCORE_SUBMIT_RATE_WINDOW_SECONDS = 60
FEEDBACK_SUBMIT_RATE_LIMIT = 12
FEEDBACK_SUBMIT_RATE_WINDOW_SECONDS = 60
AUTH_LOGIN_RATE_LIMIT = 10
AUTH_LOGIN_RATE_WINDOW_SECONDS = 15 * 60
AUTH_RESET_RATE_LIMIT = 5
AUTH_RESET_RATE_WINDOW_SECONDS = 60 * 60
AUTH_REGISTER_RATE_LIMIT = 5
AUTH_REGISTER_RATE_WINDOW_SECONDS = 60 * 60
ADMIN_LOGIN_RATE_LIMIT = 8
ADMIN_LOGIN_RATE_WINDOW_SECONDS = 15 * 60

FEEDBACK_GAME_CATALOG = (
    {"id": "t1", "section": "rxn", "admin_group": "reaction"},
    {"id": "t2", "section": "str", "admin_group": "stroop"},
    {"id": "t3", "section": "prs", "admin_group": "pursuit"},
    {"id": "t4", "section": "bal", "admin_group": "balance"},
    {"id": "t5", "section": "mem", "admin_group": "memory"},
    {"id": "t6", "section": "rfl", "admin_group": "reflex"},
    {"id": "t7", "section": "drv", "admin_group": "driving"},
    {"id": "t8", "section": "pong", "admin_group": "pong"},
    {"id": "t9", "section": "ice", "admin_group": "ice"},
    {"id": "t10", "section": "tilt", "admin_group": "tilt"},
    {"id": "t11", "section": "dino", "admin_group": "dino"},
)
FEEDBACK_GAME_BY_ID = {game["id"]: game for game in FEEDBACK_GAME_CATALOG}
GAME_SETTING_KEYS = {
    game["id"]: f"game_{game['section']}_enabled"
    for game in FEEDBACK_GAME_CATALOG
}
FEEDBACK_DIFFICULTIES = frozenset({"too_easy", "perfect", "too_hard"})

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def ensure_schema(db=None):
    if db is None: db = get_db()
    db.execute('''CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        nickname TEXT,
        total_score INTEGER,
        rxn_score INTEGER, rxn_median REAL, rxn_mean REAL,
        str_score INTEGER, str_accuracy REAL, str_mean REAL,
        prs_score INTEGER, prs_error REAL, time_to_catch_ms REAL,
        rfl_score INTEGER, rfl_hits INTEGER, rfl_attempts INTEGER,
        rfl_best_error REAL, rfl_avg_error REAL,
        pong_score INTEGER, pong_hits INTEGER, pong_attempts INTEGER,
        pong_best_error REAL, pong_avg_error REAL,
        drv_score INTEGER, drv_collisions INTEGER, drv_distance REAL, drv_duration_ms INTEGER,
        bal_score INTEGER, bal_std REAL,
        mem_score REAL, mem_time_ms INTEGER, mem_errors INTEGER,
        is_cheater INTEGER DEFAULT 0,
        cheat_reason TEXT,
        cheat_details TEXT,
        cheat_avatar_path TEXT,
        ice_score INTEGER, ice_hits INTEGER, ice_mistakes INTEGER, ice_best_combo INTEGER, ice_elapsed_ms INTEGER, ice_accuracy REAL, ice_duration_ms INTEGER,
        tilt_score INTEGER, tilt_catches INTEGER, tilt_collisions INTEGER, tilt_control REAL, tilt_elapsed_ms INTEGER, tilt_misses INTEGER, tilt_sensor_samples INTEGER, tilt_sensor_used INTEGER,
        dino_score INTEGER, dino_jumps INTEGER, dino_obstacles INTEGER, dino_misses INTEGER, dino_distance REAL, dino_elapsed_ms INTEGER, dino_sensor_used INTEGER
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        login TEXT NOT NULL UNIQUE COLLATE NOCASE,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT,
        auth_version INTEGER NOT NULL DEFAULT 1,
        role TEXT NOT NULL DEFAULT 'player',
        google_id TEXT UNIQUE,
        avatar_path TEXT
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        used_at INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_started INTEGER NOT NULL,
        request_count INTEGER NOT NULL
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS security_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        action TEXT NOT NULL,
        actor_user_id INTEGER,
        ip_hash TEXT,
        details TEXT
    )''')
    db.execute("CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit(created_at DESC)")
    db.execute('''CREATE TABLE IF NOT EXISTS game_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        run_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        score REAL,
        stars INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        user_id INTEGER,
        UNIQUE(run_id, game_id)
    )''')
    db.execute("CREATE INDEX IF NOT EXISTS idx_game_feedback_created_at ON game_feedback(created_at DESC)")
    db.execute('''CREATE TABLE IF NOT EXISTS score_deletions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        user_id INTEGER NOT NULL
    )''')
    db.execute("CREATE INDEX IF NOT EXISTS idx_score_deletions_user_day ON score_deletions(user_id, created_at)")

    # Ensure new columns exist without requiring a destructive migration
    score_columns = {row["name"] for row in db.execute("PRAGMA table_info(scores)").fetchall()}
    if "user_id" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN user_id INTEGER")
        score_columns.add("user_id")
    if "mem_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN mem_score REAL")
    if "mem_time_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN mem_time_ms INTEGER")
    if "mem_errors" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN mem_errors INTEGER")
    if "rfl_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN rfl_score INTEGER")
    if "rfl_hits" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN rfl_hits INTEGER")
    if "rfl_attempts" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN rfl_attempts INTEGER")
    if "rfl_best_error" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN rfl_best_error REAL")
    if "rfl_avg_error" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN rfl_avg_error REAL")
    if "pong_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN pong_score INTEGER")
    if "pong_hits" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN pong_hits INTEGER")
    if "pong_attempts" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN pong_attempts INTEGER")
    if "pong_best_error" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN pong_best_error REAL")
    if "pong_avg_error" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN pong_avg_error REAL")
    if "drv_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN drv_score INTEGER")
    if "drv_collisions" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN drv_collisions INTEGER")
    if "drv_distance" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN drv_distance REAL")
    if "drv_duration_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN drv_duration_ms INTEGER")
    if "ice_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_score INTEGER")
    if "ice_hits" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_hits INTEGER")
    if "ice_mistakes" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_mistakes INTEGER")
    if "ice_best_combo" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_best_combo INTEGER")
    if "ice_elapsed_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_elapsed_ms INTEGER")
    if "ice_accuracy" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_accuracy REAL")
    if "ice_duration_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN ice_duration_ms INTEGER")
    if "tilt_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_score INTEGER")
    if "tilt_catches" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_catches INTEGER")
    if "tilt_collisions" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_collisions INTEGER")
    if "tilt_control" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_control REAL")
    if "tilt_elapsed_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_elapsed_ms INTEGER")
    if "tilt_misses" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_misses INTEGER")
    if "tilt_sensor_samples" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_sensor_samples INTEGER")
    if "tilt_sensor_used" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN tilt_sensor_used INTEGER")
    if "dino_score" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_score INTEGER")
    if "dino_jumps" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_jumps INTEGER")
    if "dino_obstacles" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_obstacles INTEGER")
    if "dino_misses" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_misses INTEGER")
    if "dino_distance" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_distance REAL")
    if "dino_elapsed_ms" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_elapsed_ms INTEGER")
    if "dino_sensor_used" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN dino_sensor_used INTEGER")
    if "is_cheater" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN is_cheater INTEGER DEFAULT 0")
    if "cheat_reason" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN cheat_reason TEXT")
    if "cheat_details" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN cheat_details TEXT")
    if "cheat_avatar_path" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN cheat_avatar_path TEXT")
    user_columns = {row["name"] for row in db.execute("PRAGMA table_info(users)").fetchall()}
    if "auth_version" not in user_columns:
        db.execute("ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1")
        user_columns.add("auth_version")
    if "avatar_path" not in user_columns:
        db.execute("ALTER TABLE users ADD COLUMN avatar_path TEXT")
    db.commit()
    db.commit()

def init_db():
    db = get_db()
    ensure_schema(db)
    # The ninth game was added after the original eight-game default. Only
    # migrate an untouched legacy configuration; never overwrite a setting
    # that already mentions the new game.
    ice_setting = db.execute("SELECT 1 FROM settings WHERE key = 'game_ice_enabled'").fetchone()
    total_setting = db.execute("SELECT value FROM settings WHERE key = 'session_total_games'").fetchone()
    if ice_setting is None and total_setting is not None:
        try:
            if int(json.loads(total_setting["value"])) == 8:
                db.execute("UPDATE settings SET value = ? WHERE key = 'session_total_games'", (json.dumps(9),))
                db.commit()
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    tilt_setting = db.execute("SELECT 1 FROM settings WHERE key = 'game_tilt_enabled'").fetchone()
    total_setting = db.execute("SELECT value FROM settings WHERE key = 'session_total_games'").fetchone()
    if tilt_setting is None and total_setting is not None:
        try:
            if int(json.loads(total_setting["value"])) == 9:
                db.execute("UPDATE settings SET value = ? WHERE key = 'session_total_games'", (json.dumps(10),))
                db.commit()
        except (TypeError, ValueError, json.JSONDecodeError):
            pass


def consume_rate_limit(bucket: str, identity: str, limit: int, window_seconds: int) -> bool:
    """Consume one request from a small SQLite-backed sliding window.

    The counter lives in SQLite rather than process memory so the limit is
    shared by all Gunicorn workers. On a database error we fail open to keep
    score submission available, while recording the problem in the logs.
    """
    now = int(time.time())
    identity_hash = hashlib.sha256(identity.encode("utf-8", "ignore")).hexdigest()
    key = f"{bucket}:{identity_hash}"
    db = get_db()
    try:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            "DELETE FROM rate_limits WHERE window_started < ?",
            (now - window_seconds,),
        )
        row = db.execute(
            "SELECT window_started, request_count FROM rate_limits WHERE key = ?",
            (key,),
        ).fetchone()
        if row is not None and now - int(row["window_started"]) < window_seconds:
            if int(row["request_count"]) >= limit:
                db.rollback()
                return False
            db.execute(
                "UPDATE rate_limits SET request_count = request_count + 1 WHERE key = ?",
                (key,),
            )
        else:
            db.execute(
                "INSERT INTO rate_limits(key, window_started, request_count) VALUES(?, ?, 1) "
                "ON CONFLICT(key) DO UPDATE SET window_started = excluded.window_started, request_count = excluded.request_count",
                (key, now),
            )
        db.commit()
        return True
    except sqlite3.Error:
        db.rollback()
        app.logger.exception("Impossible de mettre à jour la limitation de fréquence (%s).", bucket)
        return True


def get_request_identity() -> str:
    """Return a privacy-preserving, stable key for per-client protections."""
    # ProxyFix normalizes remote_addr when the application is behind its single
    # trusted reverse proxy. Never persist the raw address in the database.
    return request.remote_addr or "unknown"


def score_deletion_day_start(timestamp: Optional[int] = None) -> int:
    current = datetime.datetime.fromtimestamp(int(timestamp or time.time()))
    return int(current.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())


def get_player_score_deletion_limit(settings: Optional[dict] = None) -> int:
    source = settings if settings is not None else get_settings()
    try:
        configured = int(source.get("player_score_deletions_per_day", 0))
    except (TypeError, ValueError):
        configured = 0
    return max(0, min(100, configured))


def record_security_event(action: str, *, actor_user_id: Optional[int] = None, details: Optional[dict] = None) -> None:
    """Keep a compact admin-only security trail without storing secrets or raw IPs."""
    safe_details = details or {}
    try:
        get_db().execute(
            "INSERT INTO security_audit(created_at, action, actor_user_id, ip_hash, details) VALUES (?, ?, ?, ?, ?)",
            (
                int(time.time()),
                action,
                actor_user_id,
                hashlib.sha256(get_request_identity().encode("utf-8", "ignore")).hexdigest(),
                json.dumps(safe_details, separators=(",", ":")),
            ),
        )
        # Keep only a short operational trail: useful for investigation, but
        # not an indefinitely growing store of behavioral metadata.
        get_db().execute(
            "DELETE FROM security_audit WHERE id NOT IN (SELECT id FROM security_audit ORDER BY id DESC LIMIT 1000)"
        )
        get_db().commit()
    except sqlite3.Error:
        # Audit logging must never make login, logout, or recovery unavailable.
        app.logger.exception("Impossible d'enregistrer l'événement de sécurité %s.", action)

def get_settings():
    if hasattr(g, "settings_cache"):
        return g.settings_cache

    db = get_db()
    rows = db.execute(
        "SELECT key, value FROM settings WHERE key NOT IN (?, ?, ?)",
        ("admin_login", "admin_password_hash", ADMIN_AUTH_VERSION_SETTING_KEY),
    ).fetchall()
    store = { r["key"]: json.loads(r["value"]) for r in rows }
    merged = DEFAULT_SETTINGS.copy()
    merged.update(store)
    g.settings_cache = merged
    return merged


def get_public_settings(settings: Optional[dict] = None) -> dict:
    source = settings if settings is not None else get_settings()
    return {key: value for key, value in source.items() if key not in SENSITIVE_SETTING_KEYS}


def get_admin_client_settings(settings: Optional[dict] = None) -> dict:
    """Expose admin settings to the browser without exposing the SMTP secret."""
    source = dict(settings if settings is not None else get_settings())
    source["smtp_password"] = ""
    return source


def safe_next_url(value: Optional[str]) -> Optional[str]:
    candidate = (value or "").strip()
    if not candidate or candidate.startswith("//"):
        return None
    parsed = urlsplit(candidate)
    if parsed.scheme or parsed.netloc or not candidate.startswith("/"):
        return None
    return candidate

def set_settings(newvals: dict):
    db = get_db()
    for k, v in newvals.items():
        db.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, json.dumps(v)))
    db.commit()
    if hasattr(g, "settings_cache"):
        del g.settings_cache


def get_admin_credentials():
    if hasattr(g, "admin_credentials"):
        return g.admin_credentials

    db = get_db()
    rows = db.execute(
        "SELECT key, value FROM settings WHERE key IN (?, ?)",
        ("admin_login", "admin_password_hash"),
    ).fetchall()
    login = DEFAULT_ADMIN_LOGIN
    password_hash = DEFAULT_ADMIN_PASSWORD_HASH
    for row in rows:
        if row["key"] == "admin_login":
            try:
                login = json.loads(row["value"])
            except json.JSONDecodeError:
                login = DEFAULT_ADMIN_LOGIN
        elif row["key"] == "admin_password_hash":
            try:
                password_hash = json.loads(row["value"])
            except json.JSONDecodeError:
                password_hash = DEFAULT_ADMIN_PASSWORD_HASH

    g.admin_credentials = {"login": login, "password_hash": password_hash}
    return g.admin_credentials


def set_admin_credentials(*, login=None, password_hash=None):
    updates = {}
    if login is not None:
        updates["admin_login"] = login
    if password_hash is not None:
        updates["admin_password_hash"] = password_hash
    if updates:
        db = get_db()
        for key, value in updates.items():
            db.execute(
                "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, json.dumps(value)),
            )
        db.commit()
    if hasattr(g, "admin_credentials"):
        del g.admin_credentials


def get_admin_auth_version() -> int:
    row = get_db().execute("SELECT value FROM settings WHERE key = ?", (ADMIN_AUTH_VERSION_SETTING_KEY,)).fetchone()
    if row is None:
        return 1
    try:
        return max(1, int(json.loads(row["value"])))
    except (TypeError, ValueError, json.JSONDecodeError):
        return 1


def rotate_admin_auth_version() -> int:
    version = get_admin_auth_version() + 1
    get_db().execute(
        "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (ADMIN_AUTH_VERSION_SETTING_KEY, json.dumps(version)),
    )
    get_db().commit()
    return version


def is_admin_authenticated() -> bool:
    if session.get(ADMIN_SESSION_KEY) is not True:
        return False
    current_version = get_admin_auth_version()
    session_version = session.get(ADMIN_AUTH_VERSION_SESSION_KEY)
    if session_version != current_version:
        session.clear()
        return False
    return True


def is_google_login_available() -> bool:
    return google_oauth is not None


def _normalize_identifier(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value.lower() if value else None


def get_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    if not user_id:
        return None
    return get_db().execute("SELECT * FROM users WHERE id = ?", (int(user_id),)).fetchone()


def find_user_by_login(login: str) -> Optional[sqlite3.Row]:
    normalized = _normalize_identifier(login)
    if not normalized:
        return None
    return get_db().execute(
        "SELECT * FROM users WHERE login = ? COLLATE NOCASE",
        (normalized,),
    ).fetchone()


def find_user_by_email(email: str) -> Optional[sqlite3.Row]:
    normalized = _normalize_identifier(email)
    if not normalized:
        return None
    return get_db().execute(
        "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
        (normalized,),
    ).fetchone()


def find_user_by_nickname(nickname: str) -> Optional[sqlite3.Row]:
    normalized = _normalize_identifier(nickname)
    if not normalized:
        return None
    return get_db().execute(
        "SELECT * FROM users WHERE nickname = ? COLLATE NOCASE",
        (normalized,),
    ).fetchone()


def find_conflicting_user_by_nickname(
    nickname: str,
    *,
    exclude_user_id: Optional[int] = None,
) -> Optional[sqlite3.Row]:
    normalized = _normalize_identifier(nickname)
    if not normalized:
        return None

    params = [normalized]
    query = "SELECT * FROM users WHERE INSTR(?, LOWER(nickname)) > 0"
    if exclude_user_id is not None:
        try:
            params.append(int(exclude_user_id))
        except (TypeError, ValueError):
            exclude_user_id = None
        else:
            query += " AND id != ?"
    return get_db().execute(query + " LIMIT 1", params).fetchone()


def _cleanup_password_resets():
    cutoff = int(time.time()) - (PASSWORD_RESET_TOKEN_TTL * 2)
    db = get_db()
    db.execute(
        "DELETE FROM password_resets WHERE (used_at IS NOT NULL) OR created_at < ?",
        (cutoff,),
    )
    db.commit()


def _hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_password_reset_token(token)
    created_at = int(time.time())
    db = get_db()
    _cleanup_password_resets()
    db.execute(
        "INSERT INTO password_resets (user_id, token_hash, created_at) VALUES (?, ?, ?)",
        (int(user_id), token_hash, created_at),
    )
    db.commit()
    return token


def find_password_reset_request(token: str) -> Optional[sqlite3.Row]:
    if not token:
        return None
    token_hash = _hash_password_reset_token(token)
    row = get_db().execute(
        """
        SELECT password_resets.*, users.email AS user_email, users.login AS user_login, users.nickname AS user_nickname
        FROM password_resets
        JOIN users ON users.id = password_resets.user_id
        WHERE password_resets.token_hash = ?
        LIMIT 1
        """,
        (token_hash,),
    ).fetchone()
    if row is None:
        return None
    if row["used_at"]:
        return None
    created_at = int(row["created_at"] or 0)
    if created_at < int(time.time()) - PASSWORD_RESET_TOKEN_TTL:
        return None
    return row


def mark_password_reset_used(reset_id: int, db: Optional[sqlite3.Connection] = None) -> None:
    commit = False
    if db is None:
        db = get_db()
        commit = True
    db.execute(
        "UPDATE password_resets SET used_at = ? WHERE id = ?",
        (int(time.time()), int(reset_id)),
    )
    if commit:
        db.commit()


def _resolve_smtp_security(value: Optional[str]) -> str:
    if not value:
        return "starttls"
    value = str(value).strip().lower()
    if value not in SMTP_SECURITY_MODES:
        return "starttls"
    return value


def send_email_via_smtp(*, subject: str, body: str, recipient: str, settings: Optional[dict] = None) -> bool:
    settings = settings or get_settings()
    host = (settings.get("smtp_host") or "").strip()
    sender = (settings.get("smtp_sender") or "").strip()
    username = (settings.get("smtp_username") or "").strip()
    password = settings.get("smtp_password") or ""
    port_raw = settings.get("smtp_port")
    try:
        port = int(port_raw)
    except (TypeError, ValueError):
        port = 0
    security = _resolve_smtp_security(settings.get("smtp_security"))

    if not host or not port or not recipient:
        app.logger.warning("SMTP configuration incomplete; cannot send email")
        return False

    if not sender:
        sender = username

    if not sender:
        app.logger.warning("No SMTP sender configured; cannot send email")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    context = ssl.create_default_context()
    try:
        if security == "ssl":
            with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as server:
                if username:
                    server.login(username, password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as server:
                server.ehlo()
                if security == "starttls":
                    server.starttls(context=context)
                    server.ehlo()
                if username:
                    server.login(username, password)
                server.send_message(message)
    except Exception as exc:  # pragma: no cover - relies on external SMTP service
        app.logger.error("Failed to send email: %s", exc)
        return False

    return True


def test_smtp_connection(settings: Optional[dict] = None) -> tuple[bool, str]:
    """Check SMTP reachability and authentication without sending a message."""
    settings = settings or get_settings()
    host = (settings.get("smtp_host") or "").strip()
    username = (settings.get("smtp_username") or "").strip()
    password = settings.get("smtp_password") or ""
    try:
        port = int(settings.get("smtp_port"))
    except (TypeError, ValueError):
        port = 0
    security = _resolve_smtp_security(settings.get("smtp_security"))

    if not host or not port:
        return False, "incomplete"

    context = ssl.create_default_context()
    try:
        if security == "ssl":
            with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as server:
                server.ehlo()
                if username:
                    server.login(username, password)
        else:
            with smtplib.SMTP(host, port, timeout=20) as server:
                server.ehlo()
                if security == "starttls":
                    server.starttls(context=context)
                    server.ehlo()
                if username:
                    server.login(username, password)
    except smtplib.SMTPAuthenticationError:
        app.logger.warning("SMTP test authentication failed")
        return False, "authentication"
    except ssl.SSLError:
        app.logger.warning("SMTP test TLS negotiation failed")
        return False, "tls"
    except (OSError, smtplib.SMTPException, TimeoutError):
        app.logger.warning("SMTP test connection failed")
        return False, "connection"
    except Exception:  # pragma: no cover - defensive boundary for external SMTP services
        app.logger.exception("Unexpected SMTP test failure")
        return False, "unknown"

    return True, "ok"


def send_password_reset_email(user: sqlite3.Row, reset_url: str) -> bool:
    mapping = dict(user)
    nickname = mapping.get("user_nickname") or mapping.get("nickname")
    login = mapping.get("user_login") or mapping.get("login")
    recipient = mapping.get("user_email") or mapping.get("email")
    if not recipient:
        return False

    display_name = nickname or login or "joueur"
    subject = "Réinitialise ton mot de passe jsuisdechire"
    body = f"""Salut {display_name},

Tu as demandé à réinitialiser ton mot de passe sur jsuisdechire.com.
Clique sur le lien suivant pour choisir un nouveau mot de passe (il expire dans {PASSWORD_RESET_TOKEN_TTL // 60} minutes) :

{reset_url}

Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.

À très vite sur jsuisdechire.com !
"""
    return send_email_via_smtp(subject=subject, body=body, recipient=recipient)


def _delete_avatar_file(path: Optional[str]) -> None:
    if not path:
        return
    candidate = STATIC_ROOT / path
    try:
        if candidate.is_file():
            candidate.unlink()
    except OSError:
        pass


def _store_avatar_bytes(user_id: int, data: bytes, extension: str) -> str:
    timestamp = int(time.time())
    filename = f"user_{user_id}_{timestamp}{extension}"
    full_path = AVATAR_UPLOAD_FOLDER / filename
    with full_path.open("wb") as handle:
        handle.write(data)
    relative_path = f"{UPLOAD_SUBDIR}/{filename}"
    return relative_path


def _set_user_avatar_path(user_id: int, avatar_path: Optional[str]) -> None:
    db = get_db()
    db.execute("UPDATE users SET avatar_path = ? WHERE id = ?", (avatar_path, int(user_id)))
    db.commit()


def create_user(*, login: str, email: str, nickname: str, password: Optional[str], role: str = DEFAULT_USER_ROLE,
                google_id: Optional[str] = None, avatar_path: Optional[str] = None) -> sqlite3.Row:
    login_value = (login or "").strip()
    email_value = (email or "").strip()
    nickname_value = (nickname or "").strip()
    if not login_value or not email_value or not nickname_value:
        raise ValueError("Missing required user fields")
    password_hash = generate_password_hash(password) if password else None
    created_at = int(time.time())
    db = get_db()
    db.execute(
        """
        INSERT INTO users (created_at, login, email, nickname, password_hash, role, google_id, avatar_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            created_at,
            login_value,
            email_value,
            nickname_value,
            password_hash,
            role or DEFAULT_USER_ROLE,
            google_id,
            avatar_path,
        ),
    )
    db.commit()
    return find_user_by_login(login_value)


def login_user(user: sqlite3.Row) -> None:
    # Regenerate all signed-session state on authentication, including CSRF and
    # transient OAuth data, so an anonymous browser state cannot survive login.
    session.clear()
    session[USER_SESSION_KEY] = int(user["id"])
    session[USER_AUTH_VERSION_SESSION_KEY] = int(user["auth_version"] or 1)
    session[CSRF_SESSION_KEY] = secrets.token_urlsafe(32)


def logout_user() -> None:
    session.pop(USER_SESSION_KEY, None)


def get_current_user() -> Optional[sqlite3.Row]:
    return getattr(g, "current_user", None)


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not is_admin_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"ok": False, "error": "auth_required"}), 401
            return redirect(url_for("admin_login", next=request.url))
        return view(*args, **kwargs)

    return wrapped

@app.template_filter('datetime')
def _fmt_ts(ts):
    return datetime.datetime.fromtimestamp(int(ts)).strftime('%Y-%m-%d %H:%M')

@app.before_request
def _ensure_db():
    if not os.path.exists(DB_PATH):
        open(DB_PATH, "a").close()
    init_db()


@app.before_request
def _load_current_user():
    user_id = session.get(USER_SESSION_KEY)
    user = get_user_by_id(user_id) if user_id else None
    if user is not None:
        expected_version = int(user["auth_version"] or 1)
        session_version = session.get(USER_AUTH_VERSION_SESSION_KEY)
        if session_version != expected_version:
            session.clear()
            user = None
    g.current_user = user

@app.route("/")
def home():
    db = get_db()
    home_stats = get_home_score_summary(db)
    return render_template("home.html", app_name=APP_NAME, home_stats=home_stats)

@app.route("/select-games")
def select_games():
    return render_template("select_games.html", app_name=APP_NAME)

@app.route("/training")
def training():
    settings = get_settings()
    enabled_game_ids = [
        game["id"]
        for game in FEEDBACK_GAME_CATALOG
        if bool(settings.get(GAME_SETTING_KEYS[game["id"]], False))
    ]
    return render_template(
        "training.html",
        app_name=APP_NAME,
        enabled_game_ids=enabled_game_ids,
    )

@app.route("/t1")
def t1():
    return render_template("t1.html", app_name=APP_NAME)

@app.route("/t2")
def t2():
    return render_template("t2.html", app_name=APP_NAME)

@app.route("/t3")
def t3():
    return render_template("t3.html", app_name=APP_NAME)

@app.route("/t4")
def t4():
    return render_template("t4.html", app_name=APP_NAME)

@app.route("/t5")
def t5():
    return render_template("t5.html", app_name=APP_NAME)

@app.route("/t6")
def t6():
    return render_template("t6.html", app_name=APP_NAME)

@app.route("/t7")
def t7():
    return render_template("t7.html", app_name=APP_NAME)

@app.route("/t8")
def t8():
    return render_template("t8.html", app_name=APP_NAME)

@app.route("/t9")
def t9():
    return render_template("t9.html", app_name=APP_NAME)

@app.route("/t10")
def t10():
    return render_template("t10.html", app_name=APP_NAME)

@app.route("/t11")
def t11():
    return render_template("t11.html", app_name=APP_NAME)

@app.route("/results")
def results_page():
    return render_template("results.html", app_name=APP_NAME)


@app.route("/credits")
def credits_view():
    return render_template("credits.html", app_name=APP_NAME)


@app.route("/jj-hub")
def jj_hub_view():
    return render_template("jj_hub.html", app_name=APP_NAME)

LATEST_SCORES_CTE = """
WITH normalized_scores AS (
    SELECT
        scores.*,
        LOWER(COALESCE(scores.nickname, '')) AS group_key
    FROM scores
),
ranked_scores AS (
    SELECT
        normalized_scores.*,
        ROW_NUMBER() OVER (
            PARTITION BY normalized_scores.group_key
            ORDER BY normalized_scores.created_at DESC, normalized_scores.id DESC
        ) AS row_rank
    FROM normalized_scores
),
latest_scores AS (
    SELECT
        id,
        created_at,
        nickname,
        total_score,
        rxn_score,
        rxn_median,
        rxn_mean,
        str_score,
        str_accuracy,
        str_mean,
        prs_score,
        prs_error,
        time_to_catch_ms,
        rfl_score,
        rfl_hits,
        rfl_attempts,
        rfl_best_error,
        rfl_avg_error,
        pong_score,
        pong_hits,
        pong_attempts,
        pong_best_error,
        pong_avg_error,
        drv_score,
        drv_collisions,
        drv_distance,
        drv_duration_ms,
        bal_score,
        bal_std,
        mem_score,
        mem_time_ms,
        mem_errors,
        ice_score,
        ice_hits,
        ice_mistakes,
        ice_best_combo,
        ice_elapsed_ms,
        ice_accuracy,
        ice_duration_ms,
        tilt_score,
        tilt_catches,
        tilt_collisions,
        tilt_control,
        tilt_elapsed_ms,
        tilt_misses,
        tilt_sensor_samples,
        tilt_sensor_used,
        dino_score,
        dino_jumps,
        dino_obstacles,
        dino_misses,
        dino_distance,
        dino_elapsed_ms,
        dino_sensor_used,
        user_id,
        is_cheater,
        cheat_reason,
        cheat_details,
        cheat_avatar_path
    FROM ranked_scores
    WHERE row_rank = 1
)
"""


HOME_CLEAN_SCORE_THRESHOLD = 60


def get_home_score_summary(db: sqlite3.Connection) -> dict:
    threshold = HOME_CLEAN_SCORE_THRESHOLD
    row = db.execute(
        """
        SELECT
            SUM(CASE WHEN scores.is_cheater = 1 THEN 1 ELSE 0 END) AS cheater_count,
            SUM(
                CASE
                    WHEN scores.is_cheater != 1
                    AND scores.total_score IS NOT NULL
                    AND scores.total_score >= ?
                    THEN 1
                    ELSE 0
                END
            ) AS clean_count,
            SUM(
                CASE
                    WHEN scores.is_cheater != 1
                    AND (scores.total_score IS NULL OR scores.total_score < ?)
                    THEN 1
                    ELSE 0
                END
            ) AS wasted_count
        FROM scores
        """,
        (threshold, threshold),
    ).fetchone()

    if not row:
        return {"clean": 0, "wasted": 0, "cheater": 0}

    return {
        "clean": int(row["clean_count"] or 0),
        "wasted": int(row["wasted_count"] or 0),
        "cheater": int(row["cheater_count"] or 0),
    }

LEADERBOARD_SORTS = {
    "total_score": {
        "expression": "scores.total_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "rxn_score": {
        "expression": "scores.rxn_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "str_score": {
        "expression": "scores.str_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "prs_score": {
        "expression": "scores.prs_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "rfl_score": {
        "expression": "scores.rfl_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "pong_score": {
        "expression": "scores.pong_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "drv_score": {
        "expression": "scores.drv_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "mem_score": {
        "expression": "scores.mem_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "bal_score": {
        "expression": "scores.bal_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "ice_score": {
        "expression": "scores.ice_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "tilt_score": {
        "expression": "scores.tilt_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "dino_score": {
        "expression": "scores.dino_score",
        "default_order": "desc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "nickname": {
        "expression": "LOWER(COALESCE(scores.nickname, ''))",
        "default_order": "asc",
        "secondary": ["scores.created_at DESC", "scores.id DESC"],
    },
    "created_at": {
        "expression": "scores.created_at",
        "default_order": "desc",
        "secondary": ["scores.id DESC"],
    },
}


@app.route("/leaderboard")
def leaderboard():
    db = get_db()
    per_page = 50
    page = request.args.get("page", default=1, type=int) or 1
    if page < 1:
        page = 1

    offset = (page - 1) * per_page

    requested_sort = (request.args.get("sort", "") or "").strip().lower()
    sort_config = LEADERBOARD_SORTS.get(requested_sort)
    if sort_config is None:
        sort_key = "total_score"
        sort_config = LEADERBOARD_SORTS[sort_key]
    else:
        sort_key = requested_sort

    requested_order = (request.args.get("order", "") or "").strip().lower()
    if requested_order not in {"asc", "desc"}:
        sort_order = sort_config["default_order"]
    else:
        sort_order = requested_order

    sort_direction = "ASC" if sort_order == "asc" else "DESC"
    order_clauses = [f"{sort_config['expression']} {sort_direction}"]
    for clause in sort_config.get("secondary", []):
        order_clauses.append(clause)
    order_sql = ", ".join(order_clauses)

    base_select = LATEST_SCORES_CTE + """
        SELECT
            scores.*,
            CASE WHEN users.id IS NOT NULL THEN users.id END AS verified_user_id,
            CASE WHEN users.id IS NOT NULL THEN users.avatar_path END AS avatar_path
        FROM latest_scores AS scores
        LEFT JOIN users ON (
            users.id = scores.user_id
            OR (
                scores.user_id IS NULL
                AND LOWER(users.nickname) = LOWER(COALESCE(scores.nickname, ''))
            )
        )
    """

    podium_order_sql = ", ".join(
        [
            "scores.total_score DESC",
            "scores.created_at DESC",
            "scores.id DESC",
        ]
    )

    podium_rows = db.execute(
        base_select
        + f"""
        ORDER BY {podium_order_sql}
        LIMIT 3
        """
    ).fetchall()

    query = db.execute(
        base_select
        + f"""
        ORDER BY {order_sql}
        LIMIT ? OFFSET ?
        """,
        (per_page + 1, offset),
    ).fetchall()

    has_next = len(query) > per_page
    rows = list(query[:per_page])
    has_prev = page > 1

    def _adapt_rows(iterable):
        adapted = []
        for row in iterable:
            mapping = dict(row)
            raw_details = mapping.get("cheat_details")
            if isinstance(raw_details, str):
                try:
                    mapping["cheat_details"] = json.loads(raw_details)
                except json.JSONDecodeError:
                    mapping["cheat_details"] = None
            else:
                mapping["cheat_details"] = None
            adapted.append(mapping)
        return adapted

    podium_rows = _adapt_rows(podium_rows)
    rows = _adapt_rows(rows)

    return render_template(
        "leaderboard.html",
        rows=rows,
        app_name=APP_NAME,
        page=page,
        per_page=per_page,
        has_next=has_next,
        has_prev=has_prev,
        rank_offset=offset,
        sort_key=sort_key,
        sort_order=sort_order,
        sort_defaults={key: cfg["default_order"] for key, cfg in LEADERBOARD_SORTS.items()},
        podium_rows=podium_rows,
    )

@app.get("/api/settings")
def api_settings():
    settings = get_settings()
    if is_admin_authenticated():
        return jsonify(get_admin_client_settings(settings))
    return jsonify(get_public_settings(settings))


@app.get("/api/session")
def api_session():
    """Expose only the display-safe account state used to keep the PWA in sync."""
    user = get_current_user()
    if user is None:
        return jsonify({"user": None})
    avatar_url = asset_url(user["avatar_path"]) if user["avatar_path"] else None
    return jsonify({"user": {
        "id": int(user["id"]),
        "nickname": user["nickname"],
        "avatar_url": avatar_url,
    }})

@app.post("/api/admin/settings")
@require_admin
def api_admin_settings():
    data = request.get_json(silent=True) or {}
    filtered = {k: data[k] for k in data if k in ALLOWED_SETTING_KEYS}
    if "smtp_password" in filtered and not str(filtered["smtp_password"] or ""):
        filtered.pop("smtp_password")
    candidate = get_settings()
    candidate.update(filtered)
    validation_errors = validate_settings(candidate)
    if validation_errors:
        return jsonify({"ok": False, "error": "invalid_settings", "fields": validation_errors[:20]}), 400
    set_settings(filtered)
    record_security_event("admin_settings_updated", details={"keys": sorted(filtered)})
    return jsonify({"ok": True, "saved": filtered})


@app.post("/api/admin/smtp-test")
@require_admin
def api_admin_smtp_test():
    data = request.get_json(silent=True) or {}
    settings = get_settings()
    for key in SENSITIVE_SETTING_KEYS:
        if key in data and (key != "smtp_password" or str(data[key] or "")):
            settings[key] = data[key]

    ok, status = test_smtp_connection(settings)
    record_security_event("admin_smtp_test", details={"ok": ok, "status": status})
    if ok:
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": status}), 400


@app.post("/api/admin/smtp-test-email")
@require_admin
def api_admin_smtp_test_email():
    data = request.get_json(silent=True) or {}
    recipient = (data.get("recipient") or "").strip()
    _, parsed_address = parseaddr(recipient)
    if not parsed_address or parsed_address != recipient or "@" not in parsed_address or len(parsed_address) > 254:
        return jsonify({"ok": False, "error": "invalid_recipient"}), 400

    settings = get_settings()
    for key in SENSITIVE_SETTING_KEYS:
        if key in data and (key != "smtp_password" or str(data[key] or "")):
            settings[key] = data[key]

    validation_errors = validate_settings(settings)
    if validation_errors:
        return jsonify({"ok": False, "error": "invalid_settings", "fields": validation_errors[:20]}), 400

    if not settings.get("smtp_sender") and not settings.get("smtp_username"):
        return jsonify({"ok": False, "error": "sender_missing"}), 400

    sent = send_email_via_smtp(
        subject="Email de test — jsuisdechire",
        body="Ceci est un email de test envoyé depuis la configuration SMTP de jsuisdechire.com.",
        recipient=recipient,
        settings=settings,
    )
    if not sent:
        record_security_event("admin_smtp_test_email", details={"ok": False})
        return jsonify({"ok": False, "error": "send_failed"}), 502
    record_security_event("admin_smtp_test_email", details={"ok": True})
    return jsonify({"ok": True})


@app.get("/api/admin/credentials")
@require_admin
def api_admin_credentials():
    creds = get_admin_credentials()
    return jsonify({"login": creds["login"]})


@app.post("/api/admin/credentials")
@require_admin
def api_admin_credentials_update():
    data = request.get_json(silent=True) or {}
    creds = get_admin_credentials()
    current_password = data.get("current_password") or ""
    if not creds["password_hash"] or not check_password_hash(creds["password_hash"], current_password):
        return jsonify({"ok": False, "error": "invalid_password"}), 400

    new_login = (data.get("login") or "").strip()
    new_password = data.get("new_password") or ""
    updates = {}
    if new_login:
        updates["login"] = new_login
    if new_password:
        updates["password_hash"] = generate_password_hash(new_password)

    if not updates:
        return jsonify({"ok": False, "error": "no_changes"}), 400

    set_admin_credentials(**updates)
    if "password_hash" in updates:
        admin_auth_version = rotate_admin_auth_version()
        session.clear()
        session[ADMIN_SESSION_KEY] = True
        session[ADMIN_AUTH_VERSION_SESSION_KEY] = admin_auth_version
        session[CSRF_SESSION_KEY] = secrets.token_urlsafe(32)
    record_security_event("admin_credentials_updated", details={"login_changed": "login" in updates, "password_changed": "password_hash" in updates})
    return jsonify({"ok": True, "login": updates.get("login", creds["login"])})

@app.post("/api/admin/clear")
@require_admin
def api_admin_clear():
    db = get_db()
    db.execute("DELETE FROM scores")
    db.commit()
    record_security_event("admin_scores_cleared")
    return jsonify({"ok": True})

@app.get("/api/admin/users")
@require_admin
def api_admin_users():
    rows = get_db().execute("SELECT id, login, email, nickname, role, created_at, password_hash, google_id, avatar_path FROM users ORDER BY created_at DESC").fetchall()
    payload = []
    for row in rows:
        payload.append({
            "id": int(row["id"]),
            "login": row["login"],
            "email": row["email"],
            "nickname": row["nickname"],
            "role": row["role"],
            "created_at": row["created_at"],
            "has_password": bool(row["password_hash"]),
            "has_google": bool(row["google_id"]),
            "avatar_path": row["avatar_path"],
        })
    return jsonify(payload)


@app.get("/api/admin/security-audit")
@require_admin
def api_admin_security_audit():
    rows = get_db().execute(
        "SELECT id, created_at, action, actor_user_id, details FROM security_audit ORDER BY id DESC LIMIT 200"
    ).fetchall()
    events = []
    for row in rows:
        try:
            details = json.loads(row["details"] or "{}")
        except json.JSONDecodeError:
            details = {}
        events.append({
            "id": int(row["id"]),
            "created_at": int(row["created_at"]),
            "action": row["action"],
            "actor_user_id": row["actor_user_id"],
            "details": details,
        })
    return jsonify(events)


@app.post("/api/admin/users/<int:user_id>/reset-password")
@require_admin
def api_admin_reset_user_password(user_id: int):
    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"ok": False, "error": "not_found"}), 404

    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()
    if not password:
        return jsonify({"ok": False, "error": "password_required"}), 400

    db = get_db()
    db.execute(
        "UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?",
        (generate_password_hash(password), int(user_id)),
    )
    db.commit()
    record_security_event("admin_user_password_reset", details={"user_id": int(user_id)})
    return jsonify({"ok": True, "user_id": int(user_id)})


@app.post("/api/admin/users/<int:user_id>/delete")
@require_admin
def api_admin_delete_user(user_id: int):
    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"ok": False, "error": "not_found"}), 404

    db = get_db()
    db.execute("UPDATE scores SET user_id = NULL WHERE user_id = ?", (int(user_id),))
    db.execute("DELETE FROM users WHERE id = ?", (int(user_id),))
    db.commit()
    record_security_event("admin_user_deleted", details={"user_id": int(user_id)})
    return jsonify({"ok": True, "deleted": int(user_id)})


@app.get("/api/admin/scores")
@require_admin
def api_admin_scores():
    rows = get_db().execute("SELECT * FROM scores ORDER BY created_at DESC").fetchall()
    payload = []
    for row in rows:
        payload.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "nickname": row["nickname"],
            "total_score": row["total_score"],
            "rxn_score": row["rxn_score"],
            "rxn_median": row["rxn_median"],
            "rxn_mean": row["rxn_mean"],
            "str_score": row["str_score"],
            "str_accuracy": row["str_accuracy"],
            "str_mean": row["str_mean"],
            "prs_score": row["prs_score"],
            "prs_error": row["prs_error"],
            "time_to_catch_ms": row["time_to_catch_ms"],
            "rfl_score": row["rfl_score"],
            "rfl_hits": row["rfl_hits"],
            "rfl_attempts": row["rfl_attempts"],
            "rfl_best_error": row["rfl_best_error"],
            "rfl_avg_error": row["rfl_avg_error"],
            "pong_score": row["pong_score"],
            "pong_hits": row["pong_hits"],
            "pong_attempts": row["pong_attempts"],
            "pong_best_error": row["pong_best_error"],
            "pong_avg_error": row["pong_avg_error"],
            "drv_score": row["drv_score"],
            "drv_collisions": row["drv_collisions"],
            "drv_distance": row["drv_distance"],
            "drv_duration_ms": row["drv_duration_ms"],
            "bal_score": row["bal_score"],
            "bal_std": row["bal_std"],
            "mem_score": row["mem_score"],
            "mem_time_ms": row["mem_time_ms"],
            "mem_errors": row["mem_errors"],
            "ice_score": row["ice_score"],
            "ice_hits": row["ice_hits"],
            "ice_mistakes": row["ice_mistakes"],
            "ice_best_combo": row["ice_best_combo"],
            "ice_elapsed_ms": row["ice_elapsed_ms"],
            "ice_accuracy": row["ice_accuracy"],
            "ice_duration_ms": row["ice_duration_ms"],
            "tilt_score": row["tilt_score"],
            "tilt_catches": row["tilt_catches"],
            "tilt_collisions": row["tilt_collisions"],
            "tilt_control": row["tilt_control"],
            "tilt_elapsed_ms": row["tilt_elapsed_ms"],
            "tilt_misses": row["tilt_misses"],
            "tilt_sensor_samples": row["tilt_sensor_samples"],
            "tilt_sensor_used": row["tilt_sensor_used"],
            "dino_score": row["dino_score"],
            "dino_jumps": row["dino_jumps"],
            "dino_obstacles": row["dino_obstacles"],
            "dino_misses": row["dino_misses"],
            "dino_distance": row["dino_distance"],
            "dino_elapsed_ms": row["dino_elapsed_ms"],
            "dino_sensor_used": row["dino_sensor_used"],
        })
    return jsonify(payload)


@app.post("/api/admin/scores/delete")
@require_admin
def api_admin_delete_scores():
    data = request.get_json(silent=True) or {}
    ids = data.get("ids") or []
    try:
        ids = [int(i) for i in ids if int(i) > 0]
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "invalid_ids"}), 400

    if not ids:
        return jsonify({"ok": False, "error": "empty"}), 400

    db = get_db()
    query = "DELETE FROM scores WHERE id IN (%s)" % ",".join(["?"] * len(ids))
    db.execute(query, ids)
    db.commit()
    return jsonify({"ok": True, "deleted": ids})


@app.post("/api/scores/last/delete")
def api_delete_last_player_score():
    user = get_current_user()
    if user is None:
        return jsonify({"ok": False, "error": "auth_required"}), 401

    settings = get_settings()
    daily_limit = get_player_score_deletion_limit(settings)
    if daily_limit <= 0:
        return jsonify({"ok": False, "error": "deletion_disabled"}), 403

    db = get_db()
    user_id = int(user["id"])
    now = int(time.time())
    day_start = score_deletion_day_start(now)

    try:
        db.execute("BEGIN IMMEDIATE")
        deletion_count = db.execute(
            "SELECT COUNT(*) AS total FROM score_deletions WHERE user_id = ? AND created_at >= ?",
            (user_id, day_start),
        ).fetchone()["total"]
        remaining = max(0, daily_limit - int(deletion_count))
        if deletion_count >= daily_limit:
            db.rollback()
            return jsonify({"ok": False, "error": "daily_limit", "remaining": 0, "limit": daily_limit}), 429

        latest = db.execute(
            "SELECT id FROM scores WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
        if latest is None:
            db.rollback()
            return jsonify({"ok": False, "error": "not_found"}), 404

        deleted_id = int(latest["id"])
        cursor = db.execute("DELETE FROM scores WHERE id = ? AND user_id = ?", (deleted_id, user_id))
        if cursor.rowcount != 1:
            db.rollback()
            return jsonify({"ok": False, "error": "not_found"}), 404

        db.execute(
            "INSERT INTO score_deletions(created_at, user_id) VALUES (?, ?)",
            (now, user_id),
        )
        db.commit()
    except sqlite3.Error:
        db.rollback()
        app.logger.exception("Impossible de supprimer le dernier score du joueur %s.", user_id)
        return jsonify({"ok": False, "error": "server_error"}), 500

    record_security_event(
        "player_last_score_deleted",
        actor_user_id=user_id,
        details={"score_id": deleted_id, "remaining": remaining - 1},
    )
    return jsonify({
        "ok": True,
        "deleted": deleted_id,
        "remaining": max(0, remaining - 1),
        "limit": daily_limit,
    })

@app.get("/api/nickname/check")
def api_nickname_check():
    settings = get_settings()
    nickname = (request.args.get("nickname") or "").strip()
    max_len_raw = settings.get("nickname_max_length")
    try:
        max_len = int(max_len_raw)
    except (TypeError, ValueError):
        max_len = 0
    if max_len > 512:
        max_len = 512
    if max_len > 0:
        nickname = nickname[:max_len]
    if not nickname:
        return jsonify({"ok": False, "error": "missing_nickname"}), 400

    current_user = get_current_user()
    exclude_user_id = None
    if current_user is not None:
        try:
            exclude_user_id = int(current_user["id"])
        except (TypeError, ValueError, KeyError):
            exclude_user_id = None
    conflict = find_conflicting_user_by_nickname(nickname, exclude_user_id=exclude_user_id)
    available = conflict is None

    return jsonify({"ok": True, "available": bool(available)})


@app.post("/api/feedback")
def api_game_feedback():
    if not bool(get_settings().get("session_feedback_enabled", True)):
        return jsonify({"ok": False, "error": "feedback_disabled"}), 403

    client_identity = request.remote_addr or "unknown"
    if not consume_rate_limit(
        "game_feedback",
        client_identity,
        FEEDBACK_SUBMIT_RATE_LIMIT,
        FEEDBACK_SUBMIT_RATE_WINDOW_SECONDS,
    ):
        response = jsonify({"ok": False, "error": "rate_limited"})
        response.status_code = 429
        response.headers["Retry-After"] = str(FEEDBACK_SUBMIT_RATE_WINDOW_SECONDS)
        return response

    data = request.get_json(silent=True) or {}
    run_id = str(data.get("run_id") or "").strip()
    entries = data.get("entries")
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", run_id) or not isinstance(entries, list) or not entries or len(entries) > len(FEEDBACK_GAME_CATALOG):
        return jsonify({"ok": False, "error": "invalid_feedback"}), 400

    validated = []
    seen_games = set()
    for entry in entries:
        if not isinstance(entry, dict):
            return jsonify({"ok": False, "error": "invalid_feedback"}), 400
        game_id = str(entry.get("game_id") or "").strip()
        if game_id not in FEEDBACK_GAME_BY_ID or game_id in seen_games:
            return jsonify({"ok": False, "error": "invalid_feedback"}), 400
        seen_games.add(game_id)
        try:
            stars = int(entry.get("stars"))
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "invalid_feedback"}), 400
        if stars < 1 or stars > 5:
            return jsonify({"ok": False, "error": "invalid_feedback"}), 400
        difficulty = str(entry.get("difficulty") or "").strip()
        if difficulty not in FEEDBACK_DIFFICULTIES:
            return jsonify({"ok": False, "error": "invalid_feedback"}), 400

        score = entry.get("score")
        if score in (None, ""):
            score_value = None
        else:
            try:
                score_value = float(score)
            except (TypeError, ValueError):
                return jsonify({"ok": False, "error": "invalid_feedback"}), 400
            if not math.isfinite(score_value) or not 0 <= score_value <= 100:
                return jsonify({"ok": False, "error": "invalid_feedback"}), 400
        validated.append((game_id, score_value, stars, difficulty))

    current_user = get_current_user()
    user_id = int(current_user["id"]) if current_user is not None else None
    db = get_db()
    created_at = int(time.time())
    saved = 0
    for game_id, score_value, stars, difficulty in validated:
        cursor = db.execute(
            "INSERT OR IGNORE INTO game_feedback(created_at, run_id, game_id, score, stars, difficulty, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (created_at, run_id, game_id, score_value, stars, difficulty, user_id),
        )
        saved += int(cursor.rowcount or 0)
    db.commit()
    return jsonify({"ok": True, "saved": saved, "already_saved": saved == 0})


@app.get("/api/admin/feedback")
@require_admin
def api_admin_feedback():
    db = get_db()
    score_average_columns = ", ".join(
        f'AVG({game["section"]}_score) AS {game["id"]}_average, '
        f'COUNT({game["section"]}_score) AS {game["id"]}_count'
        for game in FEEDBACK_GAME_CATALOG
    )
    score_averages = db.execute(f"SELECT COUNT(*) AS total_games, {score_average_columns} FROM scores").fetchone()
    grouped = {
        row["game_id"]: row
        for row in db.execute(
            """
            SELECT game_id,
                   COUNT(*) AS votes,
                   AVG(stars) AS average_stars,
                   SUM(CASE WHEN difficulty = 'too_easy' THEN 1 ELSE 0 END) AS too_easy,
                   SUM(CASE WHEN difficulty = 'perfect' THEN 1 ELSE 0 END) AS perfect,
                   SUM(CASE WHEN difficulty = 'too_hard' THEN 1 ELSE 0 END) AS too_hard
            FROM game_feedback
            GROUP BY game_id
            """
        ).fetchall()
    }

    summary = []
    for game in FEEDBACK_GAME_CATALOG:
        row = grouped.get(game["id"])
        votes = int(row["votes"] or 0) if row else 0
        too_easy = int(row["too_easy"] or 0) if row else 0
        perfect = int(row["perfect"] or 0) if row else 0
        too_hard = int(row["too_hard"] or 0) if row else 0
        if votes < 3:
            recommendation = "waiting"
        elif too_hard > too_easy and too_hard > perfect:
            recommendation = "lower"
        elif too_easy > too_hard and too_easy > perfect:
            recommendation = "increase"
        else:
            recommendation = "keep"
        summary.append({
            **game,
            "votes": votes,
            "average_stars": round(float(row["average_stars"]), 2) if row and row["average_stars"] is not None else None,
            "average_score": round(float(score_averages[f'{game["id"]}_average']), 2) if score_averages[f'{game["id"]}_average'] is not None else None,
            "score_count": int(score_averages[f'{game["id"]}_count'] or 0),
            "total_games": int(score_averages["total_games"] or 0),
            "too_easy": too_easy,
            "perfect": perfect,
            "too_hard": too_hard,
            "recommendation": recommendation,
        })

    raw_recent = [dict(row) for row in db.execute(
        """
        SELECT game_feedback.id,
               game_feedback.created_at,
               game_feedback.run_id,
               game_feedback.game_id,
               game_feedback.score,
               game_feedback.stars,
               game_feedback.difficulty,
               users.login AS user_login
        FROM game_feedback
        LEFT JOIN users ON users.id = game_feedback.user_id
        ORDER BY game_feedback.created_at DESC, game_feedback.id DESC
        """
    ).fetchall()]
    grouped_recent = {}
    for row in raw_recent:
        run_id = row["run_id"]
        group = grouped_recent.setdefault(run_id, {
            "id": row["id"],
            "created_at": row["created_at"],
            "run_id": run_id,
            "user_login": row["user_login"],
            "games": [],
        })
        group["id"] = max(group["id"], row["id"])
        group["created_at"] = max(group["created_at"], row["created_at"])
        group["games"].append({
            "id": row["id"],
            "game_id": row["game_id"],
            "score": row["score"],
            "stars": row["stars"],
            "difficulty": row["difficulty"],
        })
    recent = sorted(grouped_recent.values(), key=lambda row: (row["created_at"], row["id"]), reverse=True)
    for row in recent:
        row["games_count"] = len(row["games"])
    return jsonify({
        "ok": True,
        "total_votes": sum(item["votes"] for item in summary),
        "summary": summary,
        "recent": recent,
    })


@app.post("/api/admin/feedback/delete")
@require_admin
def api_admin_delete_feedback():
    data = request.get_json(silent=True) or {}
    try:
        feedback_id = int(data.get("id"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "invalid_id"}), 400

    if feedback_id <= 0:
        return jsonify({"ok": False, "error": "invalid_id"}), 400

    db = get_db()
    cursor = db.execute("DELETE FROM game_feedback WHERE id = ?", (feedback_id,))
    if not cursor.rowcount:
        return jsonify({"ok": False, "error": "not_found"}), 404
    db.commit()
    return jsonify({"ok": True, "deleted": feedback_id})


@app.post("/api/submit")
def submit():
    client_identity = request.remote_addr or "unknown"
    if not consume_rate_limit(
        "score_submit",
        client_identity,
        SCORE_SUBMIT_RATE_LIMIT,
        SCORE_SUBMIT_RATE_WINDOW_SECONDS,
    ):
        response = jsonify({"ok": False, "error": "rate_limited"})
        response.status_code = 429
        response.headers["Retry-After"] = str(SCORE_SUBMIT_RATE_WINDOW_SECONDS)
        return response

    data = request.get_json(silent=True) or {}
    settings = get_settings()
    nickname = (data.get("nickname") or "").strip()
    max_len_raw = settings.get("nickname_max_length")
    try:
        max_len = int(max_len_raw)
    except (TypeError, ValueError):
        max_len = 0
    if max_len > 512:
        max_len = 512
    if max_len > 0:
        nickname = nickname[:max_len]
    nickname = nickname or None
    current_user = get_current_user()
    user_id = None
    if current_user is not None:
        nickname = current_user["nickname"]
        user_id = int(current_user["id"])
    elif nickname:
        reserved = find_conflicting_user_by_nickname(nickname)
        if reserved is not None:
            return jsonify({"ok": False, "error": "nickname_reserved"}), 403
    else:
        return jsonify({"ok": False, "error": "missing_nickname"}), 400
    def _section(name):
        section = data.get(name)
        return section if isinstance(section, dict) else {}

    sections = {
        "rxn": _section("rxn"),
        "str": _section("str"),
        "prs": _section("prs"),
        "bal": _section("bal"),
        "mem": _section("mem"),
        "rfl": _section("rfl"),
        "pong": _section("pong"),
        "drv": _section("drv"),
        "ice": _section("ice"),
        "tilt": _section("tilt"),
        "dino": _section("dino"),
    }

    def _parse_float(value):
        if isinstance(value, bool):
            return None
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(parsed):
            return None
        return parsed

    def _parse_int(value):
        if isinstance(value, bool):
            return None
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None
        return parsed

    field_specs = {
        "rxn": {
            "score": ("float", 0, 100),
            "median": ("float", 0, 120000),
            "mean": ("float", 0, 120000),
        },
        "str": {
            "score": ("float", 0, 100),
            "accuracy": ("float", 0, 1),
            "mean": ("float", 0, 120000),
        },
        "prs": {
            "score": ("float", 0, 100),
            "mean_error_px": ("float", 0, 5000),
            "time_to_catch_ms": ("float", 0, 120000),
        },
        "bal": {
            "score": ("float", 0, 100),
            "std_g": ("float", 0, 100),
            "std_px": ("float", 0, 100000),
            "events": ("int", 0, 100000),
            "event_count": ("int", 0, 100000),
            "duration_ms": ("int", 0, 120000),
        },
        "mem": {
            "score": ("float", 0, 100),
            "elapsed_ms": ("int", 0, 300000),
            "mistakes": ("int", 0, 1000),
        },
        "rfl": {
            "score": ("float", 0, 100),
            "hits": ("int", 0, 100),
            "attempts": ("int", 1, 100),
            "best_error_px": ("float", 0, 5000),
            "avg_error_px": ("float", 0, 5000),
        },
        "pong": {
            "score": ("float", 0, 100),
            "hits": ("int", 0, 100),
            "attempts": ("int", 1, 100),
            "best_error_px": ("float", 0, 5000),
            "avg_error_px": ("float", 0, 5000),
        },
        "drv": {
            "score": ("float", 0, 100),
            "collisions": ("int", 0, 1000),
            "distance_m": ("float", 0, 100000),
            "elapsed_ms": ("int", 0, 600000),
        },
        "ice": {
            "score": ("float", 0, 100),
            "hits": ("int", 0, 1000),
            "mistakes": ("int", 0, 1000),
            "best_combo": ("int", 0, 1000),
            "elapsed_ms": ("int", 0, 120000),
            "misses": ("int", 0, 1000),
            "sensor_samples": ("int", 0, 1000000),
            "sensor_used": ("int", 0, 1),
            "accuracy": ("float", 0, 1),
        },
        "tilt": {
            "score": ("float", 0, 100),
            "catches": ("int", 0, 1000),
            "collisions": ("int", 0, 1000),
            "control": ("float", 0, 1),
            "elapsed_ms": ("int", 0, 120000),
            "misses": ("int", 0, 1000),
            "sensor_samples": ("int", 0, 1000000),
            "sensor_used": ("int", 0, 1),
        },
        "dino": {
            "score": ("float", 0, 100),
            "jumps": ("int", 0, 1000),
            "obstacles": ("int", 0, 1000),
            "misses": ("int", 0, 1000),
            "distance_m": ("float", 0, 100000),
            "elapsed_ms": ("int", 0, 120000),
            "sensor_used": ("int", 0, 1),
        },
    }
    validated_sections = {name: {} for name in sections}
    invalid_fields = []
    for section_name, specs in field_specs.items():
        section = sections[section_name]
        for field_name, (field_type, minimum, maximum) in specs.items():
            raw_value = section.get(field_name)
            if raw_value is None or raw_value == "":
                continue
            parser = _parse_int if field_type == "int" else _parse_float
            parsed_value = parser(raw_value)
            if parsed_value is None or not minimum <= parsed_value <= maximum:
                invalid_fields.append(f"{section_name}.{field_name}")
                continue
            validated_sections[section_name][field_name] = parsed_value

    if invalid_fields:
        return jsonify({
            "ok": False,
            "error": "invalid_score_data",
            "fields": invalid_fields[:12],
        }), 400

    score_weights = {
        "rxn": 0.18,
        "str": 0.18,
        "prs": 0.18,
        "rfl": 0.12,
        "pong": 0.10,
        "drv": 0.12,
        "mem": 0.12,
        "bal": 0.10,
        "ice": 0.10,
        "tilt": 0.10,
        "dino": 0.10,
    }
    weighted_score = 0.0
    weight_sum = 0.0
    for name, weight in score_weights.items():
        score_value = validated_sections[name].get("score")
        if score_value is None:
            continue
        weighted_score += max(0.0, min(100.0, score_value)) * weight
        weight_sum += weight
    if weight_sum <= 0:
        return jsonify({"ok": False, "error": "missing_scores"}), 400
    total = int(math.floor((weighted_score / weight_sum) + 0.5))

    fields = {
        "rxn_score": validated_sections["rxn"].get("score"),
        "rxn_median": validated_sections["rxn"].get("median"),
        "rxn_mean": validated_sections["rxn"].get("mean"),
        "str_score": validated_sections["str"].get("score"),
        "str_accuracy": validated_sections["str"].get("accuracy"),
        "str_mean": validated_sections["str"].get("mean"),
        "prs_score": validated_sections["prs"].get("score"),
        "prs_error": validated_sections["prs"].get("mean_error_px"),
        "time_to_catch_ms": validated_sections["prs"].get("time_to_catch_ms"),
        "rfl_score": validated_sections["rfl"].get("score"),
        "rfl_hits": validated_sections["rfl"].get("hits"),
        "rfl_attempts": validated_sections["rfl"].get("attempts"),
        "rfl_best_error": validated_sections["rfl"].get("best_error_px"),
        "rfl_avg_error": validated_sections["rfl"].get("avg_error_px"),
        "pong_score": validated_sections["pong"].get("score"),
        "pong_hits": validated_sections["pong"].get("hits"),
        "pong_attempts": validated_sections["pong"].get("attempts"),
        "pong_best_error": validated_sections["pong"].get("best_error_px"),
        "pong_avg_error": validated_sections["pong"].get("avg_error_px"),
        "drv_score": validated_sections["drv"].get("score"),
        "drv_collisions": validated_sections["drv"].get("collisions"),
        "drv_distance": validated_sections["drv"].get("distance_m"),
        "drv_duration_ms": validated_sections["drv"].get("elapsed_ms"),
        "bal_score": validated_sections["bal"].get("score"),
        "bal_std": validated_sections["bal"].get("std_g"),
        "mem_score": validated_sections["mem"].get("score"),
        "mem_time_ms": validated_sections["mem"].get("elapsed_ms"),
        "mem_errors": validated_sections["mem"].get("mistakes"),
        "ice_score": validated_sections["ice"].get("score"),
        "ice_hits": validated_sections["ice"].get("hits"),
        "ice_mistakes": validated_sections["ice"].get("mistakes"),
        "ice_best_combo": validated_sections["ice"].get("best_combo"),
        "ice_elapsed_ms": validated_sections["ice"].get("elapsed_ms"),
        "ice_accuracy": validated_sections["ice"].get("accuracy"),
        "ice_duration_ms": validated_sections["ice"].get("elapsed_ms"),
        "tilt_score": validated_sections["tilt"].get("score"),
        "tilt_catches": validated_sections["tilt"].get("catches"),
        "tilt_collisions": validated_sections["tilt"].get("collisions"),
        "tilt_control": validated_sections["tilt"].get("control"),
        "tilt_elapsed_ms": validated_sections["tilt"].get("elapsed_ms"),
        "tilt_misses": validated_sections["tilt"].get("misses"),
        "tilt_sensor_samples": validated_sections["tilt"].get("sensor_samples"),
        "tilt_sensor_used": validated_sections["tilt"].get("sensor_used"),
        "dino_score": validated_sections["dino"].get("score"),
        "dino_jumps": validated_sections["dino"].get("jumps"),
        "dino_obstacles": validated_sections["dino"].get("obstacles"),
        "dino_misses": validated_sections["dino"].get("misses"),
        "dino_distance": validated_sections["dino"].get("distance_m"),
        "dino_elapsed_ms": validated_sections["dino"].get("elapsed_ms"),
        "dino_sensor_used": validated_sections["dino"].get("sensor_used"),
    }

    bal_section = sections["bal"]
    cheat_settings_enabled = bool(settings.get("bal_cheat_detection_enabled"))
    cheat_threshold_value = _parse_float(settings.get("bal_cheat_std_threshold"))
    cheat_min_events_value = _parse_int(settings.get("bal_cheat_min_events"))
    raw_cheat_avatar_path = settings.get("bal_cheat_avatar_path")
    cheat_avatar_path = (
        raw_cheat_avatar_path.strip()
        if isinstance(raw_cheat_avatar_path, str) and raw_cheat_avatar_path.strip()
        else None
    )
    cheat_detected = False
    cheat_reason = None
    cheat_details = None

    if cheat_settings_enabled and isinstance(bal_section, dict):
        mode = bal_section.get("mode")
        std_value = validated_sections["bal"].get("std_g")
        events_value = validated_sections["bal"].get("events")
        if events_value is None:
            events_value = validated_sections["bal"].get("event_count")
        reported_cheat = bal_section.get("cheat") if isinstance(bal_section.get("cheat"), dict) else {}
        threshold = cheat_threshold_value if (cheat_threshold_value is not None and cheat_threshold_value >= 0) else None
        min_events = cheat_min_events_value if (cheat_min_events_value is not None and cheat_min_events_value > 0) else 0
        meets_event_requirement = events_value is None or events_value >= min_events
        if mode == "sensors" and threshold is not None and std_value is not None and meets_event_requirement:
            if std_value <= threshold:
                cheat_detected = True
                cheat_reason = "bal_std_low"
        cheat_details = {
            "std_g": std_value,
            "threshold": threshold,
            "events": events_value,
            "min_events": min_events,
            "reported": bool(reported_cheat.get("detected")),
        }

    if cheat_detected:
        total = -42

    cheat_details_json = json.dumps(cheat_details) if cheat_details else None
    db = get_db()
    ensure_schema(db)
    created_at = int(time.time())
    cursor = db.execute(
"INSERT INTO scores (created_at, nickname, total_score, rxn_score, rxn_median, rxn_mean, str_score, str_accuracy, str_mean, prs_score, prs_error, time_to_catch_ms, rfl_score, rfl_hits, rfl_attempts, rfl_best_error, rfl_avg_error, pong_score, pong_hits, pong_attempts, pong_best_error, pong_avg_error, drv_score, drv_collisions, drv_distance, drv_duration_ms, bal_score, bal_std, mem_score, mem_time_ms, mem_errors, ice_score, ice_hits, ice_mistakes, ice_best_combo, ice_elapsed_ms, ice_accuracy, ice_duration_ms, tilt_score, tilt_catches, tilt_collisions, tilt_control, tilt_elapsed_ms, tilt_misses, tilt_sensor_samples, tilt_sensor_used, dino_score, dino_jumps, dino_obstacles, dino_misses, dino_distance, dino_elapsed_ms, dino_sensor_used, user_id, is_cheater, cheat_reason, cheat_details, cheat_avatar_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (created_at, nickname, total,
         fields['rxn_score'], fields['rxn_median'], fields['rxn_mean'],
         fields['str_score'], fields['str_accuracy'], fields['str_mean'],
         fields['prs_score'], fields['prs_error'], fields['time_to_catch_ms'],
         fields['rfl_score'], fields['rfl_hits'], fields['rfl_attempts'], fields['rfl_best_error'], fields['rfl_avg_error'],
         fields['pong_score'], fields['pong_hits'], fields['pong_attempts'], fields['pong_best_error'], fields['pong_avg_error'],
         fields['drv_score'], fields['drv_collisions'], fields['drv_distance'], fields['drv_duration_ms'],
         fields['bal_score'], fields['bal_std'],
         fields['mem_score'], fields['mem_time_ms'], fields['mem_errors'],
         fields['ice_score'], fields['ice_hits'], fields['ice_mistakes'], fields['ice_best_combo'], fields['ice_elapsed_ms'], fields['ice_accuracy'], fields['ice_duration_ms'],
         fields['tilt_score'], fields['tilt_catches'], fields['tilt_collisions'], fields['tilt_control'], fields['tilt_elapsed_ms'],
         fields['tilt_misses'], fields['tilt_sensor_samples'], fields['tilt_sensor_used'],
         fields['dino_score'], fields['dino_jumps'], fields['dino_obstacles'], fields['dino_misses'], fields['dino_distance'], fields['dino_elapsed_ms'], fields['dino_sensor_used'],
         user_id,
         1 if cheat_detected else 0,
         cheat_reason,
         cheat_details_json,
         cheat_avatar_path if cheat_detected else None)
    )
    db.commit()

    row_id = cursor.lastrowid or 0
    ranking = db.execute(
        LATEST_SCORES_CTE
        + """
        SELECT
            SUM(
                CASE
                    WHEN scores.total_score > ?
                        OR (
                            scores.total_score = ?
                            AND (
                                scores.created_at > ?
                                OR (scores.created_at = ? AND scores.id > ?)
                            )
                        )
                    THEN 1
                    ELSE 0
                END
            ) AS ahead_count,
            COUNT(*) AS total_count
        FROM latest_scores AS scores
        """,
        (total, total, created_at, created_at, row_id),
    ).fetchone()

    if isinstance(ranking, sqlite3.Row):
        ahead = ranking["ahead_count"] or 0
        total_entries = ranking["total_count"] or 0
    else:
        ahead = (ranking[0] if ranking and len(ranking) > 0 else 0) or 0
        total_entries = (ranking[1] if ranking and len(ranking) > 1 else 0) or 0

    return jsonify({
        "ok": True,
        "id": row_id,
        "rank": int(ahead) + 1,
        "total_entries": int(total_entries),
    })


def _resolve_error_message(code: Optional[str]) -> Optional[str]:
    if not code:
        return None
    mapping = {
        "google_disabled": "La connexion Google n'est pas disponible pour le moment.",
        "google_error": "Impossible de contacter Google. Réessaie plus tard.",
        "email_in_use": "Cette adresse e-mail est déjà utilisée. Connecte-toi avec ton mot de passe.",
        "nickname_taken": "Ce surnom est déjà réservé par un autre joueur.",
        "login_taken": "Ce login est déjà utilisé.",
    }
    return mapping.get(code)


@app.route("/login", methods=["GET", "POST"])
def login_view():
    if get_current_user():
        return redirect(url_for("home"))

    error = _resolve_error_message(request.args.get("error"))
    identifier_value = ""
    next_url = safe_next_url(request.args.get("next") or request.form.get("next"))
    success_message = None

    if request.args.get("reset") == "1":
        success_message = "Ton mot de passe a été réinitialisé. Tu peux te connecter."

    if request.method == "POST":
        identifier_value = (request.form.get("login") or request.form.get("identifier") or "").strip()
        password_value = request.form.get("password") or ""
        if not consume_rate_limit("user-login", get_request_identity(), AUTH_LOGIN_RATE_LIMIT, AUTH_LOGIN_RATE_WINDOW_SECONDS):
            record_security_event("user_login_rate_limited")
            error = "Trop de tentatives. Réessaie dans quelques minutes."
        elif not identifier_value or not password_value:
            record_security_event("user_login_failed")
            error = "Identifiants invalides."
        else:
            user = find_user_by_login(identifier_value)
            if user is None:
                user = find_user_by_email(identifier_value)
            if user and user["password_hash"]:
                if check_password_hash(user["password_hash"], password_value):
                    login_user(user)
                    record_security_event("user_login_succeeded", actor_user_id=int(user["id"]))
                    return redirect(next_url or url_for("home"))
            # Use one response for an unknown account, a wrong password and a
            # Google-only account to avoid turning the form into an account
            # enumeration oracle.
            record_security_event("user_login_failed")
            error = "Identifiants invalides."

    return render_template(
        "login.html",
        app_name=APP_NAME,
        error=error,
        identifier_value=identifier_value,
        next_url=next_url,
        success_message=success_message,
    )


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password_view():
    if get_current_user():
        return redirect(url_for("home"))

    email_value = ""
    email_error = None
    submitted = False

    if request.method == "POST":
        submitted = True
        email_value = (request.form.get("email") or "").strip()
        if not consume_rate_limit("password-reset", get_request_identity(), AUTH_RESET_RATE_LIMIT, AUTH_RESET_RATE_WINDOW_SECONDS):
            record_security_event("password_reset_rate_limited")
            # Keep the same neutral confirmation shown for a valid request.
            email_value = ""
        elif not email_value:
            email_error = "Entre ton adresse e-mail."
        else:
            user = find_user_by_email(email_value)
            if user and user["password_hash"]:
                token = create_password_reset_token(int(user["id"]))
                reset_url = url_for("reset_password_view", token=token, _external=True)
                if not send_password_reset_email(user, reset_url):
                    email_error = "Impossible d'envoyer l'email. Vérifie la configuration SMTP dans l'admin."
                else:
                    email_value = ""
                    record_security_event("password_reset_requested", actor_user_id=int(user["id"]))
            else:
                # Répondre positivement pour éviter de divulguer l'existence d'un compte
                record_security_event("password_reset_requested")

    return render_template(
        "forgot_password.html",
        app_name=APP_NAME,
        email_value=email_value,
        email_error=email_error,
        submitted=submitted,
    )


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password_view(token: str):
    if get_current_user():
        return redirect(url_for("home"))

    reset_request = find_password_reset_request(token)
    if reset_request is None:
        return render_template(
            "reset_password.html",
            app_name=APP_NAME,
            invalid=True,
            error=None,
        )

    error = None
    if request.method == "POST":
        password_value = request.form.get("password") or ""
        confirm_value = request.form.get("password_confirm") or ""
        if not password_value:
            error = "Choisis un mot de passe."
        elif password_value != confirm_value:
            error = "Les deux mots de passe ne correspondent pas."
        else:
            db = get_db()
            db.execute(
                "UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?",
                (generate_password_hash(password_value), int(reset_request["user_id"])),
            )
            mark_password_reset_used(int(reset_request["id"]), db=db)
            db.commit()
            record_security_event("password_reset_completed", actor_user_id=int(reset_request["user_id"]))
            return redirect(url_for("login_view", reset="1"))

    return render_template(
        "reset_password.html",
        app_name=APP_NAME,
        invalid=False,
        error=error,
    )


@app.route("/profile", methods=["GET", "POST"])
def profile_view():
    user = get_current_user()
    if user is None:
        return redirect(url_for("login_view", next=request.url))

    errors = []
    success_message = None
    avatar_url = asset_url(user["avatar_path"]) if user["avatar_path"] else None
    last_action = None

    if request.method == "POST":
        action = request.form.get("action") or "upload"
        last_action = action
        if action == "remove":
            if user["avatar_path"]:
                _delete_avatar_file(user["avatar_path"])
                _set_user_avatar_path(int(user["id"]), None)
                success_message = "Ton avatar a été supprimé."
                user = get_user_by_id(int(user["id"]))
                g.current_user = user
                avatar_url = None
            else:
                errors.append("Tu n'as pas encore d'avatar à supprimer.")
        elif action == "update_email":
            email_value = (request.form.get("email") or "").strip()
            password_value = request.form.get("email_password") or ""
            has_password = bool(user["password_hash"])

            if not email_value or "@" not in email_value:
                errors.append("Entre une adresse e-mail valide.")

            if has_password:
                if not password_value:
                    errors.append("Entre ton mot de passe actuel pour confirmer.")
                elif not check_password_hash(user["password_hash"], password_value):
                    errors.append("Ton mot de passe actuel est incorrect.")

            if not errors:
                other_user = find_user_by_email(email_value)
                if other_user and int(other_user["id"]) != int(user["id"]):
                    errors.append("Cette adresse e-mail est déjà utilisée.")

            if not errors:
                current_email = (user["email"] or "").strip()
                normalized_current = current_email.lower()
                normalized_new = email_value.lower()

                if normalized_new == normalized_current and email_value == current_email:
                    success_message = "Ton adresse e-mail est déjà à jour."
                else:
                    db = get_db()
                    db.execute(
                        "UPDATE users SET email = ? WHERE id = ?",
                        (email_value, int(user["id"])),
                    )
                    db.commit()
                    success_message = "Ton adresse e-mail a été mise à jour."

                user = get_user_by_id(int(user["id"]))
                g.current_user = user
                avatar_url = asset_url(user["avatar_path"]) if user["avatar_path"] else None
        elif action == "update_password":
            has_password = bool(user["password_hash"])
            current_password = request.form.get("current_password") or ""
            new_password = request.form.get("new_password") or ""
            confirm_password = request.form.get("confirm_password") or ""

            if has_password:
                if not current_password:
                    errors.append("Entre ton mot de passe actuel.")
                elif not check_password_hash(user["password_hash"], current_password):
                    errors.append("Ton mot de passe actuel est incorrect.")

            if not new_password:
                errors.append("Choisis un nouveau mot de passe.")
            if new_password != confirm_password:
                errors.append("Les deux nouveaux mots de passe ne correspondent pas.")

            if not errors:
                db = get_db()
                db.execute(
                    "UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?",
                    (generate_password_hash(new_password), int(user["id"])),
                )
                db.commit()
                success_message = (
                    "Ton mot de passe a été mis à jour."
                    if has_password
                    else "Ton mot de passe a été défini."
                )
                user = get_user_by_id(int(user["id"]))
                g.current_user = user
                login_user(user)
                record_security_event("user_password_updated", actor_user_id=int(user["id"]))
                avatar_url = asset_url(user["avatar_path"]) if user["avatar_path"] else None
        else:
            file = request.files.get("avatar")
            if not file or not file.filename:
                errors.append("Choisis une image à téléverser.")
            else:
                data = file.read(MAX_AVATAR_BYTES + 1)
                image_format = None
                if len(data) > MAX_AVATAR_BYTES:
                    errors.append(f"Ton image est trop lourde (max {MAX_AVATAR_SIZE_LABEL}).")
                else:
                    image_format = imghdr.what(None, data)
                    if image_format not in ALLOWED_AVATAR_FORMATS:
                        errors.append("Format d'image non pris en charge. Utilise un PNG ou un JPG.")
                if not errors and image_format:
                    extension = ALLOWED_AVATAR_FORMATS[image_format]
                    _delete_avatar_file(user["avatar_path"])
                    relative_path = _store_avatar_bytes(int(user["id"]), data, extension)
                    _set_user_avatar_path(int(user["id"]), relative_path)
                    success_message = "Ton avatar a été mis à jour."
                    user = get_user_by_id(int(user["id"]))
                    g.current_user = user
                    avatar_url = asset_url(relative_path)

    has_password = bool(user and user["password_hash"])
    email_form_value = (user["email"] or "") if user else ""
    if last_action == "update_email" and errors:
        email_form_value = (request.form.get("email") or "").strip()

    page = request.args.get("page", default=1, type=int) or 1
    if page < 1:
        page = 1

    per_page = 25
    offset = (page - 1) * per_page

    allowed_sort_keys = {
        "total_score",
        "rxn_score",
        "str_score",
        "prs_score",
        "rfl_score",
        "pong_score",
        "drv_score",
        "mem_score",
        "bal_score",
        "ice_score",
        "tilt_score",
        "dino_score",
        "created_at",
    }

    requested_sort = (request.args.get("sort", "") or "").strip().lower()
    if requested_sort not in allowed_sort_keys:
        sort_key = "created_at"
    else:
        sort_key = requested_sort

    sort_config = LEADERBOARD_SORTS.get(sort_key, LEADERBOARD_SORTS["created_at"])

    requested_order = (request.args.get("order", "") or "").strip().lower()
    if requested_order not in {"asc", "desc"}:
        sort_order = sort_config["default_order"]
    else:
        sort_order = requested_order

    sort_direction = "ASC" if sort_order == "asc" else "DESC"
    order_clauses = [f"{sort_config['expression']} {sort_direction}"]
    for clause in sort_config.get("secondary", []):
        order_clauses.append(clause)
    order_sql = ", ".join(order_clauses)

    score_filters = []
    score_params = []

    user_id = int(user["id"]) if user and user["id"] else None
    if user_id:
        score_filters.append("scores.user_id = ?")
        score_params.append(user_id)

    nickname = (user["nickname"] or "") if user else ""
    nickname = nickname.strip()
    if nickname:
        score_filters.append("(scores.user_id IS NULL AND LOWER(COALESCE(scores.nickname, '')) = LOWER(?))")
        score_params.append(nickname)

    score_rows = []
    has_next = False
    db = get_db()
    if score_filters:
        where_sql = " OR ".join(score_filters)
        query = db.execute(
            f"""
            SELECT scores.*
            FROM scores
            WHERE {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
            """,
            (*score_params, per_page + 1, offset),
        ).fetchall()
        has_next = len(query) > per_page
        score_rows = [dict(row) for row in query[:per_page]]

    latest_owned_score = db.execute(
        "SELECT id FROM scores WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    score_deletion_limit = get_player_score_deletion_limit()
    score_deletions_remaining = score_deletion_limit
    if score_deletion_limit > 0:
        deletion_count = get_db().execute(
            "SELECT COUNT(*) AS total FROM score_deletions WHERE user_id = ? AND created_at >= ?",
            (user_id, score_deletion_day_start()),
        ).fetchone()["total"]
        score_deletions_remaining = max(0, score_deletion_limit - int(deletion_count))

    has_prev = page > 1

    format_labels = sorted({"JPG" if key == "jpeg" else key.upper() for key in ALLOWED_AVATAR_FORMATS.keys()})
    return render_template(
        "profile.html",
        app_name=APP_NAME,
        errors=errors,
        success_message=success_message,
        user=user,
        avatar_url=avatar_url,
        has_avatar=bool(user and user["avatar_path"]),
        has_password=has_password,
        email_form_value=email_form_value,
        max_avatar_size_label=MAX_AVATAR_SIZE_LABEL,
        allowed_avatar_formats=format_labels,
        score_rows=score_rows,
        score_page=page,
        score_has_next=has_next,
        score_has_prev=has_prev,
        score_rank_offset=offset,
        score_sort_key=sort_key,
        score_sort_order=sort_order,
        score_sort_defaults={
            key: cfg["default_order"] for key, cfg in LEADERBOARD_SORTS.items() if key in allowed_sort_keys
        },
        score_per_page=per_page,
        latest_owned_score_id=int(latest_owned_score["id"]) if latest_owned_score else None,
        score_deletion_limit=score_deletion_limit,
        score_deletions_remaining=score_deletions_remaining,
    )


@app.route("/register", methods=["GET", "POST"])
def register_view():
    if get_current_user():
        return redirect(url_for("home"))

    errors = []
    form_values = {
        "email": "",
        "nickname": "",
    }

    error_from_query = _resolve_error_message(request.args.get("error"))
    if error_from_query:
        errors.append(error_from_query)

    settings = get_settings()
    nickname_max = settings.get("nickname_max_length") or 0

    if request.method == "POST":
        email_value = (request.form.get("email") or "").strip()
        nickname_value = (request.form.get("nickname") or "").strip()
        password_value = request.form.get("password") or ""
        password_confirm = request.form.get("password_confirm") or ""

        form_values.update({
            "email": email_value,
            "nickname": nickname_value,
        })

        if not consume_rate_limit("user-registration", get_request_identity(), AUTH_REGISTER_RATE_LIMIT, AUTH_REGISTER_RATE_WINDOW_SECONDS):
            record_security_event("user_registration_rate_limited")
            errors.append("Trop de créations de compte. Réessaie dans une heure.")
        if not email_value or "@" not in email_value:
            errors.append("Entre une adresse e-mail valide.")
        if not nickname_value:
            errors.append("Choisis un surnom.")
        else:
            try:
                limit = int(nickname_max)
            except (TypeError, ValueError):
                limit = 0
            if limit and len(nickname_value) > limit:
                errors.append(f"Ton surnom doit faire au maximum {limit} caractères.")
        if not password_value:
            errors.append("Choisis un mot de passe.")
        if password_value != password_confirm:
            errors.append("Les deux mots de passe ne correspondent pas.")

        if not errors:
            if find_user_by_email(email_value) is not None:
                errors.append("Cette adresse e-mail est déjà utilisée.")
            if find_conflicting_user_by_nickname(nickname_value) is not None:
                errors.append("Ce surnom est déjà réservé.")

        if not errors:
            try:
                user = create_user(
                    login=nickname_value,
                    email=email_value,
                    nickname=nickname_value,
                    password=password_value,
                )
            except sqlite3.IntegrityError:
                errors.append("Impossible de créer le compte. Réessaie avec d'autres identifiants.")
            else:
                login_user(user)
                record_security_event("user_registered", actor_user_id=int(user["id"]))
                return redirect(url_for("home"))

    return render_template(
        "register.html",
        app_name=APP_NAME,
        errors=errors,
        values=form_values,
        nickname_max=nickname_max,
    )


@app.route("/logout", methods=["POST"])
def logout_view():
    logout_user()
    session.pop(GOOGLE_PENDING_SESSION_KEY, None)
    session.pop("google_next", None)
    return redirect(url_for("home"))


@app.route("/auth/google/start")
def auth_google_start():
    if not is_google_login_available():
        return redirect(url_for("register_view", error="google_disabled"))
    next_url = safe_next_url(request.args.get("next"))
    if next_url:
        session["google_next"] = next_url
    redirect_uri = url_for("auth_google_callback", _external=True)
    return google_oauth.authorize_redirect(redirect_uri)


@app.route("/auth/google/callback")
def auth_google_callback():
    if not is_google_login_available():
        return redirect(url_for("register_view", error="google_disabled"))
    try:
        token = google_oauth.authorize_access_token()
    except Exception:
        return redirect(url_for("register_view", error="google_error"))

    userinfo = None
    try:
        userinfo = google_oauth.parse_id_token(token)
    except Exception:
        userinfo = None
    if not userinfo:
        try:
            resp = google_oauth.get("userinfo")
            if resp.ok:
                userinfo = resp.json()
        except Exception:
            userinfo = None

    if not userinfo:
        return redirect(url_for("register_view", error="google_error"))

    google_id = userinfo.get("sub") or userinfo.get("id")
    email = (userinfo.get("email") or "").strip()
    name = (userinfo.get("name") or "").strip()
    if not google_id or not email:
        return redirect(url_for("register_view", error="google_error"))

    db = get_db()
    existing = db.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
    if existing:
        next_url = safe_next_url(session.get("google_next"))
        login_user(existing)
        record_security_event("user_login_succeeded", actor_user_id=int(existing["id"]), details={"provider": "google"})
        return redirect(next_url or url_for("home"))

    email_user = find_user_by_email(email)
    if email_user:
        if email_user["google_id"] == google_id:
            next_url = safe_next_url(session.get("google_next"))
            login_user(email_user)
            record_security_event("user_login_succeeded", actor_user_id=int(email_user["id"]), details={"provider": "google"})
            return redirect(next_url or url_for("home"))
        return redirect(url_for("login_view", error="email_in_use"))

    session[GOOGLE_PENDING_SESSION_KEY] = {
        "google_id": google_id,
        "email": email,
        "name": name,
    }
    return redirect(url_for("google_complete"))


@app.route("/auth/google/complete", methods=["GET", "POST"])
def google_complete():
    if not is_google_login_available():
        return redirect(url_for("register_view"))
    pending = session.get(GOOGLE_PENDING_SESSION_KEY)
    if not pending:
        return redirect(url_for("register_view"))

    errors = []
    nickname_value = (request.form.get("nickname") or "").strip() if request.method == "POST" else ""
    suggested = pending.get("name") or pending.get("email", "").split("@")[0]
    settings = get_settings()
    nickname_max = settings.get("nickname_max_length") or 0

    if request.method == "POST":
        if not nickname_value:
            errors.append("Choisis un surnom.")
        else:
            try:
                limit = int(nickname_max)
            except (TypeError, ValueError):
                limit = 0
            if limit and len(nickname_value) > limit:
                errors.append(f"Ton surnom doit faire au maximum {limit} caractères.")
        if not errors and find_conflicting_user_by_nickname(nickname_value) is not None:
            errors.append("Ce surnom est déjà réservé.")

        if not errors:
            try:
                user = create_user(
                    login=nickname_value,
                    email=pending["email"],
                    nickname=nickname_value,
                    password=None,
                    google_id=pending["google_id"],
                )
            except sqlite3.IntegrityError:
                errors.append("Impossible d'enregistrer ton compte Google. Réessaie plus tard.")
            else:
                next_url = safe_next_url(session.get("google_next"))
                login_user(user)
                record_security_event("user_registered", actor_user_id=int(user["id"]), details={"provider": "google"})
                return redirect(next_url or url_for("home"))

    return render_template(
        "google_complete.html",
        app_name=APP_NAME,
        errors=errors,
        pending=pending,
        suggested_nickname=suggested,
        nickname_value=nickname_value or suggested,
        nickname_max=nickname_max,
    )

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "ts": int(time.time())})


@app.get("/api/csrf")
def api_csrf():
    """Return the current session's CSRF token for a page restored from cache."""
    response = jsonify({"token": get_csrf_token()})
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers.add("Vary", "Cookie")
    return response


@app.get("/robots.txt")
def robots_txt():
    return (
        "User-agent: *\n"
        "Disallow: /admin\n"
        "Disallow: /api/\n",
        200,
        {"Content-Type": "text/plain; charset=utf-8"},
    )


@app.get("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder, "icons/icon-192.png", mimetype="image/png")

@app.route("/admin")
@require_admin
def admin():
    return render_template("admin.html", app_name=APP_NAME)


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if is_admin_authenticated():
        return redirect(url_for("admin"))

    error = None
    if request.method == "POST":
        login = (request.form.get("login") or "").strip()
        password = request.form.get("password") or ""
        creds = get_admin_credentials()
        if not consume_rate_limit("admin-login", get_request_identity(), ADMIN_LOGIN_RATE_LIMIT, ADMIN_LOGIN_RATE_WINDOW_SECONDS):
            record_security_event("admin_login_rate_limited")
            error = "Trop de tentatives. Réessaie dans quelques minutes."
        elif (
            creds["password_hash"]
            and login == creds["login"]
            and check_password_hash(creds["password_hash"], password)
        ):
            session.clear()
            session[ADMIN_SESSION_KEY] = True
            session[ADMIN_AUTH_VERSION_SESSION_KEY] = get_admin_auth_version()
            session[CSRF_SESSION_KEY] = secrets.token_urlsafe(32)
            record_security_event("admin_login_succeeded")
            next_url = safe_next_url(request.args.get("next"))
            return redirect(next_url or url_for("admin"))
        else:
            record_security_event("admin_login_failed")
            error = "Identifiants invalides"

    return render_template("admin_login.html", app_name=APP_NAME, error=error)


@app.post("/admin/logout")
@require_admin
def admin_logout():
    record_security_event("admin_logout")
    session.pop(ADMIN_SESSION_KEY, None)
    return redirect(url_for("admin_login"))

if __name__ == "__main__":
    debug_enabled = os.getenv("FLASK_DEBUG", "0").strip().lower() in {"1", "true", "yes", "on"}
    app.run(host="0.0.0.0", port=9001, debug=debug_enabled)
