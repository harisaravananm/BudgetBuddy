from datetime import date
from decimal import Decimal
from rest_framework.test import APITestCase
from users.models import User
from .models import Budget, Category, Expense, Income, SavingsGoal


class FinanceAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@bb.com", password="PassWord123!")
        token_resp = self.client.post("/api/auth/login/", {"email": "test@bb.com", "password": "PassWord123!"})
        self.token = token_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_income_crud(self):
        # Create
        res = self.client.post("/api/finance/incomes/", {
            "source": Income.Source.POCKET_MONEY,
            "amount": "10000.00",
            "date": "2026-10-01",
            "note": "Pocket allowance",
        })
        self.assertEqual(res.status_code, 201)
        income_id = res.data["id"]

        # List
        res = self.client.get("/api/finance/incomes/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["results"]), 1)

        # Delete
        res = self.client.delete(f"/api/finance/incomes/{income_id}/")
        self.assertEqual(res.status_code, 204)

    def test_expense_and_budget_alert_trigger(self):
        # Create a budget for food
        Budget.objects.create(
            user=self.user,
            month=date(2026, 10, 1),
            category=Category.FOOD,
            limit_amount=Decimal("1000.00"),
            alert_threshold_percent=80,
        )

        # Create expense that crosses threshold
        res = self.client.post("/api/finance/expenses/", {
            "category": Category.FOOD,
            "amount": "850.00",
            "date": "2026-10-05",
            "note": "Groceries",
        })
        self.assertEqual(res.status_code, 201)

        # Notification should have been generated
        notifs = self.client.get("/api/notifications/")
        self.assertEqual(notifs.status_code, 200)
        self.assertGreaterEqual(len(notifs.data["results"]), 1)

    def test_savings_goal_deposit_and_withdraw(self):
        goal = SavingsGoal.objects.create(
            user=self.user,
            name="Emergency Fund",
            target_amount=Decimal("5000.00"),
            saved_amount=Decimal("1000.00"),
        )
        res = self.client.post(f"/api/finance/goals/{goal.id}/deposit/", {"amount": "2000.00"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["saved_amount"], "3000.00")

        res = self.client.post(f"/api/finance/goals/{goal.id}/withdraw/", {"amount": "500.00"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["saved_amount"], "2500.00")

    def test_analytics_endpoint(self):
        res = self.client.get("/api/finance/analytics/?month=2026-10")
        self.assertEqual(res.status_code, 200)
        self.assertIn("summary", res.data)
        self.assertIn("category_spending", res.data)
        self.assertIn("monthly_trends", res.data)

    def test_reports_endpoints(self):
        res = self.client.get("/api/reports/summary/?month=2026-10")
        self.assertEqual(res.status_code, 200)
        self.assertIn("total_income", res.data)

        res = self.client.get("/api/reports/export-csv/?month=2026-10")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "text/csv")

        res = self.client.get("/api/reports/export-pdf/?month=2026-10")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "text/html")
