
from flask import Flask, render_template, request, jsonify, g, url_for, session, redirect
import sqlite3, os, time, datetime, json, hashlib
from functools import lru_cache, wraps
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

APP_NAME = "jsuisdechire"
DB_PATH = os.path.join(os.path.dirname(__file__), "data.sqlite")
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")

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
    rows = get_db().execute("SELECT * FROM scores ORDER BY total_score DESC, created_at DESC LIMIT 50").fetchall()
    return render_template("leaderboard.html", rows=rows, app_name=APP_NAME)

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
    db.execute(
        "INSERT INTO scores (created_at, nickname, total_score, rxn_score, rxn_median, rxn_mean, str_score, str_accuracy, str_mean, prs_score, prs_error, time_to_catch_ms, bal_score, bal_std) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (int(time.time()), nickname, total,
         fields['rxn_score'], fields['rxn_median'], fields['rxn_mean'],
         fields['str_score'], fields['str_accuracy'], fields['str_mean'],
         fields['prs_score'], fields['prs_error'], fields['time_to_catch_ms'],
         fields['bal_score'], fields['bal_std'])
    )
    db.commit()
    return jsonify({"ok": True})

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
