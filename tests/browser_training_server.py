"""Local browser-test fixture: real Flask pages, temporary DB, short games."""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as application

settings = {
    "rxn_trials": 1, "rxn_wait_min_ms": 30, "rxn_wait_range_ms": 0,
    "str_rounds": 1, "prs_duration_ms": 1000, "prs_max_attempts": 1,
    "bal_duration_ms": 3000, "mem_pairs": 2, "mem_initial_reveal_ms": 300,
    "rfl_attempts": 1, "rfl_shuffle_moves": 1, "pong_attempts": 1,
    "drv_duration_ms": 5000, "ice_duration_ms": 10000,
    "tilt_duration_ms": 10000, "dino_duration_ms": 10000,
    "game_bal_enabled": True, "game_dino_enabled": True,
    "session_user_select_enabled": False, "session_total_games": 11,
    "session_feedback_enabled": False,
}

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="jsd-browser-") as directory:
        application.DB_PATH = str(Path(directory) / "test.sqlite")
        application.app.config.update(TESTING=True)
        with application.app.app_context():
            db = application.get_db()
            application.ensure_schema(db)
            db.executemany("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)",
                           [(key, json.dumps(value)) for key, value in settings.items()])
            db.commit()
        application.app.run(host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv)>1 else 4177,
                            use_reloader=False)
