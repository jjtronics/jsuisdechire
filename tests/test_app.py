import json
import tempfile
import unittest
from pathlib import Path

import app as app_module


class JsuisDechireAppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database_dir = tempfile.TemporaryDirectory(prefix="jsd-tests-")
        app_module.DB_PATH = str(Path(cls.database_dir.name) / "test.sqlite")
        app_module.app.config.update(TESTING=True)

    @classmethod
    def tearDownClass(cls):
        cls.database_dir.cleanup()

    def setUp(self):
        with app_module.app.app_context():
            db = app_module.get_db()
            app_module.ensure_schema(db)
            db.execute("DELETE FROM scores")
            db.execute("DELETE FROM game_feedback")
            db.execute("DELETE FROM settings")
            db.execute("DELETE FROM rate_limits")
            db.commit()

        self.client = app_module.app.test_client()
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        with self.client.session_transaction() as browser_session:
            self.csrf_token = browser_session[app_module.CSRF_SESSION_KEY]

    def post_json(self, path, payload):
        return self.client.post(
            path,
            data=json.dumps(payload),
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token},
        )

    @staticmethod
    def valid_payload():
        return {
            "nickname": "Testeur",
            "total_score": 999,
            "rxn": {"score": 80, "median": 300, "mean": 320},
            "str": {"score": 60, "accuracy": 0.75, "mean": 800},
        }

    def test_public_routes_and_versioned_service_worker(self):
        home = self.client.get("/")
        home_html = home.get_data(as_text=True)
        self.assertIn("/static/css/tailwind.css", home_html)
        self.assertNotIn("cdn.tailwindcss.com", home_html)

        for route in ("/", "/training", "/t1", "/t2", "/t3", "/t4", "/t5", "/t6", "/t7", "/t8", "/t9", "/t10", "/t11", "/credits", "/jj-hub", "/leaderboard"):
            with self.subTest(route=route):
                self.assertEqual(self.client.get(route).status_code, 200)

        training_html = self.client.get("/training").get_data(as_text=True)
        self.assertIn("?training=1", training_html)
        self.assertNotIn("/t11?training=1", training_html)

        settings = self.client.get("/api/settings").get_json()
        self.assertTrue(settings)
        self.assertFalse(any(key.startswith("smtp_") for key in settings))
        self.assertFalse(settings["game_dino_enabled"])

        service_worker = self.client.get("/sw.js")
        self.assertEqual(service_worker.status_code, 200)
        self.assertIn("jsd-cache-v", service_worker.get_data(as_text=True))
        self.assertIn("Cache-Control", service_worker.headers)

    def test_all_training_pages_load_result_screen_script(self):
        for game in range(1, 12):
            with self.subTest(game=game):
                response = self.client.get(f"/t{game}?training=1")
                self.assertEqual(response.status_code, 200)
                self.assertIn('/static/js/training.js?v=', response.get_data(as_text=True))
        with self.client.get('/static/js/training.js') as response:
            self.assertEqual(response.status_code, 200)

    def test_signed_in_player_can_delete_latest_score_with_daily_limit(self):
        unique = str(id(self))
        with app_module.app.app_context():
            db = app_module.get_db()
            cursor = db.execute(
                """
                INSERT INTO users (created_at, login, email, nickname, password_hash, auth_version, role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (int(app_module.time.time()), f"delete-{unique}", f"delete-{unique}@example.test", f"Deleteur-{unique}", None, 1, "player"),
            )
            user_id = cursor.lastrowid
            db.commit()

        with self.client.session_transaction() as browser_session:
            browser_session[app_module.USER_SESSION_KEY] = int(user_id)
            browser_session[app_module.USER_AUTH_VERSION_SESSION_KEY] = 1

        for _ in range(4):
            response = self.post_json("/api/submit", self.valid_payload())
            self.assertEqual(response.status_code, 200)

        profile = self.client.get("/profile")
        self.assertEqual(profile.status_code, 200)
        profile_html = profile.get_data(as_text=True)
        self.assertIn("deleteLatestProfileScore", profile_html)
        for game_label in ("Réflexe", "Beer pong", "Glaçon fou", "Barman précis", "Dino Dash"):
            self.assertIn(game_label, profile_html)

        with app_module.app.app_context():
            before = app_module.get_db().execute(
                "SELECT id FROM scores WHERE user_id = ? ORDER BY created_at DESC, id DESC",
                (int(user_id),),
            ).fetchall()
        self.assertEqual(len(before), 4)

        deleted = self.post_json("/api/scores/last/delete", {})
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.get_json()["remaining"], 2)

        with app_module.app.app_context():
            after = app_module.get_db().execute(
                "SELECT id FROM scores WHERE user_id = ? ORDER BY created_at DESC, id DESC",
                (int(user_id),),
            ).fetchall()
        self.assertEqual(len(after), 3)
        self.assertEqual(after[0]["id"], before[1]["id"])

        self.assertEqual(self.post_json("/api/scores/last/delete", {}).status_code, 200)
        self.assertEqual(self.post_json("/api/scores/last/delete", {}).status_code, 200)
        limited = self.post_json("/api/scores/last/delete", {})
        self.assertEqual(limited.status_code, 429)
        self.assertEqual(limited.get_json()["error"], "daily_limit")

    def test_leaderboard_lists_every_current_mini_game(self):
        page = self.client.get("/leaderboard?sort=tilt_score&order=desc")
        self.assertEqual(page.status_code, 200)
        html = page.get_data(as_text=True)
        self.assertIn("leaderboard.pong", html)
        self.assertIn("leaderboard.ice", html)
        self.assertIn("leaderboard.tilt", html)
        self.assertIn("leaderboard.dino", html)
        self.assertIn("sort=ice_score", html)
        self.assertIn("sort=tilt_score", html)

    def test_admin_routes_require_authentication(self):
        admin_page = self.client.get("/admin")
        self.assertEqual(admin_page.status_code, 302)
        self.assertIn("/admin/login", admin_page.headers["Location"])

        protected_api_requests = (
            ("/api/admin/settings", "post"),
            ("/api/admin/users", "get"),
            ("/api/admin/scores", "get"),
            ("/api/admin/feedback", "get"),
        )
        for path, method in protected_api_requests:
            with self.subTest(path=path):
                if method == "post":
                    response = self.client.post(path, json={}, headers={"X-CSRFToken": self.csrf_token})
                else:
                    response = self.client.get(path)
                self.assertEqual(response.status_code, 401)

    def test_admin_has_no_known_password_fallback(self):
        response = self.client.post(
            "/admin/login",
            data={
                "csrf_token": self.csrf_token,
                "login": "admin",
                "password": "jsuisdechire",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Identifiants invalides", response.get_data(as_text=True))

    def test_session_api_tracks_login_and_logout_without_page_reload(self):
        """The PWA uses this endpoint to correct a restored stale HTML page."""
        with app_module.app.app_context():
            user = app_module.create_user(
                login="session-sync-user",
                email="session-sync@example.test",
                nickname="Session Sync",
                password="ok",
            )

        login = self.client.post(
            "/login",
            data={
                "csrf_token": self.csrf_token,
                "login": "session-sync-user",
                "password": "ok",
            },
            follow_redirects=False,
        )
        self.assertEqual(login.status_code, 302)
        session_payload = self.client.get("/api/session", headers={"Cache-Control": "no-cache"}).get_json()
        self.assertEqual(session_payload["user"]["id"], int(user["id"]))
        self.assertEqual(session_payload["user"]["nickname"], "Session Sync")

        with self.client.session_transaction() as browser_session:
            fresh_csrf = browser_session[app_module.CSRF_SESSION_KEY]
        logout = self.client.post("/logout", data={"csrf_token": fresh_csrf}, follow_redirects=False)
        self.assertEqual(logout.status_code, 302)
        self.assertEqual(self.client.get("/api/session").get_json(), {"user": None})

    def test_submit_recalculates_total_and_normalizes_values(self):
        response = self.post_json("/api/submit", self.valid_payload())
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])

        with app_module.app.app_context():
            row = app_module.get_db().execute(
                "SELECT total_score, rxn_score, rxn_median, str_accuracy FROM scores"
            ).fetchone()
        self.assertEqual(row["total_score"], 70)
        self.assertEqual(row["rxn_score"], 80)
        self.assertEqual(row["rxn_median"], 300)
        self.assertEqual(row["str_accuracy"], 0.75)

    def test_submit_rejects_out_of_range_measurements(self):
        payload = self.valid_payload()
        payload["rxn"]["score"] = 101
        response = self.post_json("/api/submit", payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid_score_data")

        with app_module.app.app_context():
            count = app_module.get_db().execute("SELECT COUNT(*) FROM scores").fetchone()[0]
        self.assertEqual(count, 0)

    def test_feedback_is_optional_per_run_and_visible_to_admin(self):
        with app_module.app.app_context():
            db = app_module.get_db()
            db.execute(
                "INSERT INTO users(created_at, login, email, nickname, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
                (int(app_module.time.time()), "feedback-login", "feedback@example.test", "Feedback", None, "player"),
            )
            db.commit()
            user_id = db.execute("SELECT id FROM users WHERE login = ?", ("feedback-login",)).fetchone()[0]
        with self.client.session_transaction() as browser_session:
            browser_session[app_module.USER_SESSION_KEY] = user_id
            browser_session[app_module.USER_AUTH_VERSION_SESSION_KEY] = 1

        payload = {
            "run_id": "feedback-run-1234",
            "entries": [
                {"game_id": "t1", "score": 82.5, "stars": 5, "difficulty": "perfect"},
                {"game_id": "t2", "score": 61, "stars": 3, "difficulty": "too_hard"},
            ],
        }
        response = self.post_json("/api/feedback", payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"ok": True, "saved": 2, "already_saved": False})

        duplicate = self.post_json("/api/feedback", payload)
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(duplicate.get_json(), {"ok": True, "saved": 0, "already_saved": True})

        invalid = self.post_json(
            "/api/feedback",
            {"run_id": "feedback-run-invalid", "entries": [{"game_id": "t1", "stars": 6, "difficulty": "perfect"}]},
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.get_json()["error"], "invalid_feedback")

        score_response = self.post_json("/api/submit", self.valid_payload())
        self.assertEqual(score_response.status_code, 200)

        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        admin_feedback = self.client.get("/api/admin/feedback")
        self.assertEqual(admin_feedback.status_code, 200)
        data = admin_feedback.get_json()
        self.assertEqual(data["total_votes"], 2)
        self.assertEqual(len(data["recent"]), 1)
        self.assertEqual(data["recent"][0]["user_login"], "feedback-login")
        self.assertEqual(data["recent"][0]["games_count"], 2)
        self.assertEqual({entry["game_id"] for entry in data["recent"][0]["games"]}, {"t1", "t2"})
        t1_summary = next(item for item in data["summary"] if item["id"] == "t1")
        self.assertEqual(t1_summary["votes"], 1)
        self.assertEqual(t1_summary["recommendation"], "waiting")
        self.assertEqual(t1_summary["average_score"], 80.0)
        self.assertEqual(t1_summary["score_count"], 1)
        self.assertEqual(t1_summary["total_games"], 1)

        t1_vote_id = next(entry["id"] for entry in data["recent"][0]["games"] if entry["game_id"] == "t1")
        deleted = self.post_json("/api/admin/feedback/delete", {"id": t1_vote_id})
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.get_json(), {"ok": True, "deleted": t1_vote_id})

        refreshed = self.client.get("/api/admin/feedback")
        self.assertEqual(refreshed.get_json()["total_votes"], 1)
        self.assertEqual(refreshed.get_json()["recent"][0]["games_count"], 1)

        missing = self.post_json("/api/admin/feedback/delete", {"id": t1_vote_id})
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.get_json()["error"], "not_found")

    def test_feedback_can_be_disabled_from_admin_settings(self):
        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        setting_response = self.client.post(
            "/api/admin/settings",
            json={"session_feedback_enabled": False},
            headers={"X-CSRFToken": self.csrf_token},
        )
        self.assertEqual(setting_response.status_code, 200)
        self.assertFalse(setting_response.get_json()["saved"]["session_feedback_enabled"])

        with self.client.session_transaction() as browser_session:
            browser_session.pop(app_module.ADMIN_SESSION_KEY, None)
        self.assertFalse(self.client.get("/api/settings").get_json()["session_feedback_enabled"])
        response = self.post_json(
            "/api/feedback",
            {
                "run_id": "feedback-disabled",
                "entries": [{"game_id": "t1", "score": 80, "stars": 5, "difficulty": "perfect"}],
            },
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"], "feedback_disabled")

    def test_submit_is_rate_limited_per_client(self):
        responses = [self.post_json("/api/submit", self.valid_payload()) for _ in range(7)]
        self.assertEqual([response.status_code for response in responses[:6]], [200] * 6)
        self.assertEqual(responses[6].status_code, 429)
        self.assertEqual(responses[6].headers["Retry-After"], "60")

    def test_smtp_test_is_admin_only_and_does_not_send_when_incomplete(self):
        headers = {"X-CSRFToken": self.csrf_token}
        unauthenticated = self.client.post("/api/admin/smtp-test", json={}, headers=headers)
        self.assertEqual(unauthenticated.status_code, 401)

        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        response = self.client.post("/api/admin/smtp-test", json={}, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "incomplete")

    def test_admin_does_not_render_smtp_password_and_blank_keeps_existing_secret(self):
        secret = "smtp-secret-for-test"
        with app_module.app.app_context():
            app_module.set_settings({
                "smtp_host": "smtp.example.test",
                "smtp_password": secret,
            })

        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        admin_html = self.client.get("/admin").get_data(as_text=True)
        self.assertNotIn(secret, admin_html)
        self.assertIn("admin.fields.email.password_placeholder", admin_html)
        self.assertEqual(self.client.get("/api/settings").get_json()["smtp_password"], "")

        response = self.client.post(
            "/api/admin/settings",
            json={"smtp_password": ""},
            headers={"X-CSRFToken": self.csrf_token},
        )
        self.assertEqual(response.status_code, 200)
        with app_module.app.app_context():
            settings = app_module.get_settings()
        self.assertEqual(settings["smtp_password"], secret)

    def test_admin_settings_reject_incoherent_weights(self):
        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        response = self.client.post(
            "/api/admin/settings",
            json={"str_acc_weight": 0.8, "str_speed_weight": 0.8},
            headers={"X-CSRFToken": self.csrf_token},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid_settings")

    def test_smtp_test_email_rejects_invalid_recipient_without_sending(self):
        with self.client.session_transaction() as browser_session:
            browser_session[app_module.ADMIN_SESSION_KEY] = True
            browser_session[app_module.ADMIN_AUTH_VERSION_SESSION_KEY] = 1
        response = self.client.post(
            "/api/admin/smtp-test-email",
            json={"recipient": "not-an-email"},
            headers={"X-CSRFToken": self.csrf_token},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid_recipient")


if __name__ == "__main__":
    unittest.main()
