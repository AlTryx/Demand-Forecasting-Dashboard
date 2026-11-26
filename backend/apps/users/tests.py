from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.test import TestCase


class UserProfileEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="profile-user",
            password="test-password",
            email="profile@example.com",
            first_name="Alex",
            last_name="Morgan",
        )
        self.client = APIClient()
        self.url = "/api/user/me/"

    def test_me_requires_authentication(self):
        response = APIClient().get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_me_returns_current_user_profile(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "id": self.user.id,
            "email": "profile@example.com",
            "first_name": "Alex",
            "last_name": "Morgan",
            "currency": "EUR",
            "horizon_days": 30,
            "stockout_alerts": True,
            "weekly_digest": False,
            "live_stream": True,
        })

    def test_me_partially_updates_current_user_profile(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {
            "first_name": "Jordan",
            "last_name": "Taylor",
        }, format="json")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Jordan")
        self.assertEqual(self.user.last_name, "Taylor")
        self.assertEqual(self.user.email, "profile@example.com")

    def test_me_rejects_duplicate_email(self):
        get_user_model().objects.create_user(
            username="other-user",
            password="test-password",
            email="taken@example.com",
            first_name="Other",
            last_name="User",
        )
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {
            "email": "taken@example.com",
        }, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_me_persists_dashboard_settings(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {
            "currency": "USD",
            "horizon_days": 14,
            "stockout_alerts": False,
            "weekly_digest": True,
            "live_stream": False,
        }, format="json")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.currency, "USD")
        self.assertEqual(self.user.horizon_days, 14)
        self.assertFalse(self.user.stockout_alerts)
        self.assertTrue(self.user.weekly_digest)
        self.assertFalse(self.user.live_stream)

        reread = self.client.get(self.url)
        self.assertEqual(reread.data["currency"], "USD")
        self.assertEqual(reread.data["horizon_days"], 14)
