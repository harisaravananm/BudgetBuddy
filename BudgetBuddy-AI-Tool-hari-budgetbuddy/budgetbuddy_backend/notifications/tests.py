from datetime import date
from decimal import Decimal
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from finance.models import Budget, Category, Expense
from notifications.models import Notification
from users.models import User


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EmailNotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="teststudent@budgetbuddy.local",
            password="TestPassword123!",
            role=User.Role.STUDENT,
        )
        self.client.force_authenticate(user=self.user)
        mail.outbox = []

    def test_notification_settings_get_and_patch(self):
        """Verify reading and updating real-time email notification settings."""
        res = self.client.get("/api/notifications/settings/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["email_notifications_enabled"])
        self.assertEqual(res.data["alert_threshold_percent"], 80)

        # Update preferences
        patch_res = self.client.patch("/api/notifications/settings/", {
            "email_notifications_enabled": False,
            "alert_threshold_percent": 75,
            "large_expense_threshold": 3000,
        })
        self.assertEqual(patch_res.status_code, 200)
        self.assertFalse(patch_res.data["email_notifications_enabled"])
        self.assertEqual(patch_res.data["alert_threshold_percent"], 75)
        self.assertEqual(patch_res.data["large_expense_threshold"], 3000.0)

    def test_large_expense_triggers_notification_and_email(self):
        """An expense exceeding the large_expense_threshold must create a notification and send email."""
        self.user.profile.large_expense_threshold = Decimal("2000.00")
        self.user.profile.save()

        # Create an expense of 2500
        res = self.client.post("/api/finance/expenses/", {
            "category": Category.SHOPPING,
            "amount": "2500.00",
            "date": date.today().isoformat(),
            "note": "Textbooks purchase",
        })
        self.assertEqual(res.status_code, 201)

        # Verify in-app notification created
        notif = Notification.objects.filter(user=self.user, type=Notification.Type.LARGE_EXPENSE).first()
        self.assertIsNotNone(notif)
        self.assertIn("2500.00", notif.title)

    def test_budget_warning_triggers_notification(self):
        """Spending reaching budget threshold triggers a warning alert."""
        month = date.today().replace(day=1)
        budget = Budget.objects.create(
            user=self.user,
            month=month,
            category=Category.FOOD,
            limit_amount=Decimal("1000.00"),
            alert_threshold_percent=80,
        )

        # Spend 850 (85%)
        res = self.client.post("/api/finance/expenses/", {
            "category": Category.FOOD,
            "amount": "850.00",
            "date": date.today().isoformat(),
            "note": "Groceries",
        })
        self.assertEqual(res.status_code, 201)

        warning_notif = Notification.objects.filter(
            user=self.user,
            type=Notification.Type.BUDGET_WARNING,
        ).first()
        self.assertIsNotNone(warning_notif)
        self.assertIn("Food", warning_notif.title)

    def test_send_test_email_endpoint(self):
        """POST /api/notifications/send-test-email/ triggers real-time test dispatch."""
        res = self.client.post("/api/notifications/send-test-email/", {
            "email": "mentor@springboard.edu",
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])

        # Also logged in in-app notifications
        notif = Notification.objects.filter(user=self.user, type=Notification.Type.EMAIL_SENT).first()
        self.assertIsNotNone(notif)

