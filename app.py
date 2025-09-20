
from flask import Flask, render_template, request, jsonify, g, url_for
import sqlite3, os, time, datetime, json

APP_NAME = "jsuisdechire"
DB_PATH = os.path.join(os.path.dirname(__file__), "data.sqlite")
app = Flask(__name__)

# Bump this version (or provide ASSET_VERSION env var) when deploying to
# force browsers to pick up new static assets such as translations.
ASSET_VERSION = os.getenv("ASSET_VERSION", "20240603")


def asset_url(path: str) -> str:
    return url_for("static", filename=path, v=ASSET_VERSION)


@app.context_processor
def inject_asset_helpers():
    return {"asset_url": asset_url, "asset_version": ASSET_VERSION}

DEFAULT_SETTINGS = {
    "prs_timeSpeed": 0.75,
    "prs_duration_ms": 10000,
    "prs_captureRadius": 36,
    "prs_jitterAmp": 0.05,
    "bal_mode": "lin",
    "bal_duration_ms": 8000,
    "bal_low_good": 0.02,
    "bal_high_bad": 0.10,
    "bal_lin_rel_tol": 0.15,
}

ALLOWED_SETTING_KEYS = frozenset(DEFAULT_SETTINGS.keys())

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
    db = get_db()
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    store = { r["key"]: json.loads(r["value"]) for r in rows }
    merged = DEFAULT_SETTINGS.copy()
    merged.update(store)
    return merged

def set_settings(newvals: dict):
    db = get_db()
    for k, v in newvals.items():
        db.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, json.dumps(v)))
    db.commit()

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
def api_admin_settings():
    data = request.get_json(silent=True) or {}
    filtered = {k: data[k] for k in data if k in ALLOWED_SETTING_KEYS}
    set_settings(filtered)
    return jsonify({"ok": True, "saved": filtered})

@app.post("/api/admin/clear")
def api_admin_clear():
    db = get_db()
    db.execute("DELETE FROM scores")
    db.commit()
    return jsonify({"ok": True})

@app.post("/api/submit")
def submit():
    data = request.get_json(silent=True) or {}
    total = int(data.get("total_score", 0))
    nickname = (data.get("nickname") or "").strip()[:32] or None
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
def admin():
    return render_template("admin.html", app_name=APP_NAME)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9001, debug=True)
