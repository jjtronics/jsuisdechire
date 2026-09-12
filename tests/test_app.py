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

        for route in ("/", "/t1", "/t2", "/t3", "/t4", "/t5", "/t6", "/t7", "/credits", "/jj-hub", "/leaderboard"):
            with self.subTest(route=route):
                self.assertEqual(self.client.get(route).status_code, 200)

        settings = self.client.get("/api/settings").get_json()
        self.assertTrue(settings)
        self.assertFalse(any(key.startswith("smtp_") for key in settings))

        service_worker = self.client.get("/sw.js")
        self.assertEqual(service_worker.status_code, 200)
        self.assertIn("jsd-cache-v", service_worker.get_data(as_text=True))
        self.assertIn("Cache-Control", service_worker.headers)

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
        response = self.client.post("/api/admin/smtp-test", json={}, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "incomplete")


if __name__ == "__main__":
    unittest.main()
