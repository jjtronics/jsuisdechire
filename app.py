
from flask import Flask, render_template, request, jsonify, g, url_for, session, redirect, send_from_directory
import sqlite3, os, time, datetime, json, hashlib
from functools import lru_cache, wraps
from pathlib import Path
from typing import Optional
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

try:
    from authlib.integrations.flask_client import OAuth
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    OAuth = None

APP_NAME = "jsuisdechire"
DB_PATH = os.path.join(os.path.dirname(__file__), "data.sqlite")
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")

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
    hasher = hashlib.sha256()

    if static_folder.exists():
        for path in sorted(static_folder.rglob("*")):
            if path.is_file():
                relative_path = path.relative_to(static_folder).as_posix().encode("utf-8")
                hasher.update(relative_path)
                with path.open("rb") as handle:
                    for chunk in iter(lambda: handle.read(8192), b""):
                        hasher.update(chunk)

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
    return {"app_settings": get_settings()}


@app.context_processor
def inject_auth_context():
    user = get_current_user()
    payload = None
    if user is not None:
        payload = {
            "id": int(user["id"]),
            "login": user["login"],
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
        }
    return {
        "current_user": user,
        "current_user_payload": payload,
        "google_login_enabled": is_google_login_available(),
    }


@app.route("/sw.js")
def service_worker():
    return send_from_directory(app.static_folder or "static", "sw.js")

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
    "prs_jitterAmp": 0.05,
    "prs_max_attempts": 10,
    "bal_mode": "lin",
    "bal_duration_ms": 8000,
    "bal_low_good": 0.02,
    "bal_high_bad": 0.10,
    "bal_lin_rel_tol": 0.15,
    "nickname_max_length": 32,
}

ALLOWED_SETTING_KEYS = frozenset(DEFAULT_SETTINGS.keys())

DEFAULT_ADMIN_LOGIN = "admin"
DEFAULT_ADMIN_PASSWORD_HASH = generate_password_hash("jsuisdechire")
ADMIN_SESSION_KEY = "admin_authenticated"
USER_SESSION_KEY = "user_authenticated_id"
GOOGLE_PENDING_SESSION_KEY = "pending_google_signup"
DEFAULT_USER_ROLE = "player"

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
        bal_score INTEGER, bal_std REAL
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
        role TEXT NOT NULL DEFAULT 'player',
        google_id TEXT UNIQUE
    )''')

    # Ensure new columns exist without requiring a destructive migration
    score_columns = {row["name"] for row in db.execute("PRAGMA table_info(scores)").fetchall()}
    if "user_id" not in score_columns:
        db.execute("ALTER TABLE scores ADD COLUMN user_id INTEGER")
    db.commit()
    db.commit()

def init_db():
    db = get_db()
    ensure_schema(db)

def get_settings():
    if hasattr(g, "settings_cache"):
        return g.settings_cache

    db = get_db()
    rows = db.execute(
        "SELECT key, value FROM settings WHERE key NOT IN (?, ?)",
        ("admin_login", "admin_password_hash"),
    ).fetchall()
    store = { r["key"]: json.loads(r["value"]) for r in rows }
    merged = DEFAULT_SETTINGS.copy()
    merged.update(store)
    g.settings_cache = merged
    return merged

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


def is_admin_authenticated() -> bool:
    return session.get(ADMIN_SESSION_KEY) is True


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


def create_user(*, login: str, email: str, nickname: str, password: Optional[str], role: str = DEFAULT_USER_ROLE,
                google_id: Optional[str] = None) -> sqlite3.Row:
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
        INSERT INTO users (created_at, login, email, nickname, password_hash, role, google_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (created_at, login_value, email_value, nickname_value, password_hash, role or DEFAULT_USER_ROLE, google_id),
    )
    db.commit()
    return find_user_by_login(login_value)


def login_user(user: sqlite3.Row) -> None:
    session[USER_SESSION_KEY] = int(user["id"])


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
    g.current_user = get_user_by_id(user_id) if user_id else None

@app.route("/")
def home():
    return render_template("home.html", app_name=APP_NAME)

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

@app.route("/results")
def results_page():
    return render_template("results.html", app_name=APP_NAME)

@app.route("/leaderboard")
def leaderboard():
    db = get_db()
    per_page = 50
    page = request.args.get("page", default=1, type=int) or 1
    if page < 1:
        page = 1

    offset = (page - 1) * per_page
    query = db.execute(
        """
        SELECT scores.*, users.id AS verified_user_id
        FROM scores
        LEFT JOIN users ON (
            users.id = scores.user_id
            OR (
                scores.user_id IS NULL AND LOWER(users.nickname) = LOWER(COALESCE(scores.nickname, ''))
            )
        )
        ORDER BY total_score DESC, created_at DESC, id DESC
        LIMIT ? OFFSET ?
        """,
        (per_page + 1, offset),
    ).fetchall()

    has_next = len(query) > per_page
    rows = list(query[:per_page])
    has_prev = page > 1

    return render_template(
        "leaderboard.html",
        rows=rows,
        app_name=APP_NAME,
        page=page,
        per_page=per_page,
        has_next=has_next,
        has_prev=has_prev,
        rank_offset=offset,
    )

@app.get("/api/settings")
def api_settings():
    return jsonify(get_settings())

@app.post("/api/admin/settings")
@require_admin
def api_admin_settings():
    data = request.get_json(silent=True) or {}
    filtered = {k: data[k] for k in data if k in ALLOWED_SETTING_KEYS}
    set_settings(filtered)
    return jsonify({"ok": True, "saved": filtered})


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
    if not check_password_hash(creds["password_hash"], current_password):
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
        session[ADMIN_SESSION_KEY] = True
    return jsonify({"ok": True, "login": updates.get("login", creds["login"])})

@app.post("/api/admin/clear")
@require_admin
def api_admin_clear():
    db = get_db()
    db.execute("DELETE FROM scores")
    db.commit()
    return jsonify({"ok": True})

@app.get("/api/admin/users")
@require_admin
def api_admin_users():
    rows = get_db().execute("SELECT id, login, email, nickname, role, created_at, password_hash, google_id FROM users ORDER BY created_at DESC").fetchall()
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
        })
    return jsonify(payload)


@app.post("/api/admin/users/<int:user_id>/reset-password")
@require_admin
def api_admin_reset_user_password(user_id: int):
    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"ok": False, "error": "not_found"}), 404

    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()
    if len(password) < 8:
        return jsonify({"ok": False, "error": "password_too_short"}), 400

    db = get_db()
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(password), int(user_id)),
    )
    db.commit()
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
            "bal_score": row["bal_score"],
            "bal_std": row["bal_std"],
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


@app.post("/api/submit")
def submit():
    data = request.get_json(silent=True) or {}
    total = int(data.get("total_score", 0))
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
    fields = {
        "rxn_score": data.get("rxn", {}).get("score"),
        "rxn_median": data.get("rxn", {}).get("median"),
        "rxn_mean": data.get("rxn", {}).get("mean"),
        "str_score": data.get("str", {}).get("score"),
        "str_accuracy": data.get("str", {}).get("accuracy"),
        "str_mean": data.get("str", {}).get("mean"),
        "prs_score": data.get("prs", {}).get("score"),
        "prs_error": data.get("prs", {}).get("mean_error_px"),
        "time_to_catch_ms": data.get("prs", {}).get("time_to_catch_ms"),
        "bal_score": data.get("bal", {}).get("score"),
        "bal_std": data.get("bal", {}).get("std_g"),
    }
    db = get_db()
    ensure_schema(db)
    created_at = int(time.time())
    cursor = db.execute(
        "INSERT INTO scores (created_at, nickname, total_score, rxn_score, rxn_median, rxn_mean, str_score, str_accuracy, str_mean, prs_score, prs_error, time_to_catch_ms, bal_score, bal_std, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (created_at, nickname, total,
         fields['rxn_score'], fields['rxn_median'], fields['rxn_mean'],
         fields['str_score'], fields['str_accuracy'], fields['str_mean'],
         fields['prs_score'], fields['prs_error'], fields['time_to_catch_ms'],
         fields['bal_score'], fields['bal_std'], user_id)
    )
    db.commit()

    row_id = cursor.lastrowid or 0
    ahead = db.execute(
        """
        SELECT COUNT(*) FROM scores
        WHERE total_score > ?
           OR (total_score = ? AND (created_at > ? OR (created_at = ? AND id > ?)))
        """,
        (total, total, created_at, created_at, row_id)
    ).fetchone()[0]
    total_entries = db.execute("SELECT COUNT(*) FROM scores").fetchone()[0]

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
    next_url = request.args.get("next") or request.form.get("next")

    if request.method == "POST":
        identifier_value = (request.form.get("login") or request.form.get("identifier") or "").strip()
        password_value = request.form.get("password") or ""
        if not identifier_value or not password_value:
            error = "Entre ton login (ou email) et ton mot de passe."
        else:
            user = find_user_by_login(identifier_value)
            if user is None:
                user = find_user_by_email(identifier_value)
            if user and user["password_hash"]:
                if check_password_hash(user["password_hash"], password_value):
                    login_user(user)
                    return redirect(next_url or url_for("home"))
                error = "Mot de passe incorrect."
            elif user and not user["password_hash"]:
                error = "Ce compte utilise la connexion Google. Clique sur le bouton Google."
            else:
                error = "Identifiants introuvables."

    return render_template(
        "login.html",
        app_name=APP_NAME,
        error=error,
        identifier_value=identifier_value,
        next_url=next_url,
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
        if not password_value or len(password_value) < 8:
            errors.append("Ton mot de passe doit faire au moins 8 caractères.")
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
    next_url = request.args.get("next")
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
        login_user(existing)
        session.pop(GOOGLE_PENDING_SESSION_KEY, None)
        next_url = session.pop("google_next", None)
        return redirect(next_url or url_for("home"))

    email_user = find_user_by_email(email)
    if email_user:
        if email_user["google_id"] == google_id:
            login_user(email_user)
            session.pop(GOOGLE_PENDING_SESSION_KEY, None)
            next_url = session.pop("google_next", None)
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
                login_user(user)
                session.pop(GOOGLE_PENDING_SESSION_KEY, None)
                next_url = session.pop("google_next", None)
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
        if login == creds["login"] and check_password_hash(creds["password_hash"], password):
            session[ADMIN_SESSION_KEY] = True
            next_url = request.args.get("next")
            return redirect(next_url or url_for("admin"))
        error = "Identifiants invalides"

    return render_template("admin_login.html", app_name=APP_NAME, error=error)


@app.post("/admin/logout")
@require_admin
def admin_logout():
    session.pop(ADMIN_SESSION_KEY, None)
    return redirect(url_for("admin_login"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9001, debug=True)
