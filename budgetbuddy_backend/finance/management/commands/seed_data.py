from calendar import monthrange
from datetime import date
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from finance.models import Budget, Category, Expense, Income, SavingsGoal
from notifications.models import Notification
from users.models import User


def shift_month(month, offset):
    value = month.year * 12 + month.month - 1 + offset
    return date(value // 12, value % 12 + 1, 1)


class Command(BaseCommand):
    help = "Create repeatable demo data for student, premium, and admin accounts."

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        current = today.replace(day=1)
        users = [
            ("student@budgetbuddy.local", "Student123!", User.Role.STUDENT, "Aarav Sharma", 25000),
            ("premium@budgetbuddy.local", "Premium123!", User.Role.PREMIUM, "Riya Patel", 65000),
            ("admin@budgetbuddy.local", "Admin123!", User.Role.ADMIN, "BudgetBuddy Admin", 80000),
        ]
        categories = [
            Category.FOOD,
            Category.TRANSPORT,
            Category.RENT,
            Category.BOOKS,
            Category.ENTERTAINMENT,
            Category.SUBSCRIPTIONS,
            Category.HEALTH,
        ]
        limit_ranges = {
            Category.RENT: (Decimal("4000"), Decimal("6000")),
            Category.FOOD: (Decimal("2500"), Decimal("3500")),
            Category.TRANSPORT: (Decimal("800"), Decimal("1500")),
            Category.ENTERTAINMENT: (Decimal("600"), Decimal("1200")),
            Category.SUBSCRIPTIONS: (Decimal("200"), Decimal("500")),
            Category.HEALTH: (Decimal("300"), Decimal("800")),
            Category.BOOKS: (Decimal("500"), Decimal("1000")),
        }
        expense_ranges = {
            Category.RENT: (Decimal("1800"), Decimal("7200")),
            Category.FOOD: (Decimal("700"), Decimal("4200")),
            Category.TRANSPORT: (Decimal("250"), Decimal("1900")),
            Category.ENTERTAINMENT: (Decimal("180"), Decimal("1500")),
            Category.SUBSCRIPTIONS: (Decimal("80"), Decimal("650")),
            Category.HEALTH: (Decimal("120"), Decimal("1000")),
            Category.BOOKS: (Decimal("220"), Decimal("1300")),
        }
        target_ratios = [Decimal("0.35"), Decimal("0.45"), Decimal("0.65"), Decimal("0.78"),
                         Decimal("0.95"), Decimal("1.15"), Decimal("1.30")]
        for email, password, role, name, monthly_income in users:
            rng = random.Random(f"budgetbuddy:{email}:{today.isoformat()}")
            user, _ = User.objects.get_or_create(email=email)
            user.role = role
            user.is_staff = role == User.Role.ADMIN
            user.is_superuser = role == User.Role.ADMIN
            user.set_password(password)
            user.save()
            profile = user.profile
            profile.full_name = name
            profile.monthly_income = Decimal(monthly_income)
            profile.currency = "INR"
            profile.savings_target_percent = 35 if role == User.Role.PREMIUM else 25
            profile.save()

            Income.all_objects.filter(user=user).delete()
            Expense.all_objects.filter(user=user).delete()
            Budget.objects.filter(user=user).delete()
            SavingsGoal.objects.filter(user=user).delete()
            Notification.objects.filter(user=user).delete()

            multiplier = Decimal("1.0") if role == User.Role.STUDENT else (
                Decimal("2.0") if role == User.Role.PREMIUM else Decimal("2.5")
            )
            # Six complete months plus the current month through today.
            for offset in range(-6, 1):
                month = shift_month(current, offset)
                last_day = monthrange(month.year, month.month)[1]
                end_day = today.day if offset == 0 else last_day
                income_amount = Decimal(12000 + (abs(offset) * 450)) * multiplier
                Income.objects.create(
                    user=user, source=Income.Source.POCKET_MONEY,
                    amount=income_amount, date=month.replace(day=min(3, end_day)),
                    note="Monthly allowance",
                )
                if offset % 2 == 0:
                    Income.objects.create(
                        user=user, source=Income.Source.FREELANCE,
                        amount=Decimal(2500 + abs(offset) * 300) * multiplier,
                        date=month.replace(day=min(12, end_day)),
                        note="Freelance and tutoring work",
                    )
                month_expenses = []
                ratios = target_ratios[:]
                rng.shuffle(ratios)
                for index, category in enumerate(categories):
                    day = min(5 + index * 3, end_day)
                    low, high = expense_ranges[category]
                    amount = (low + (high - low) * Decimal(str(rng.random()))).quantize(Decimal("0.01"))
                    expense = Expense.objects.create(
                        user=user, category=category, amount=amount,
                        date=month.replace(day=day),
                        note=f"{dict(Category.choices)[category]} spending",
                    )
                    month_expenses.append((category, expense))

                # Budgets are independent guardrails. Their limits are selected
                # after transactions exist, but never calculated from transaction
                # totals, so utilization reflects actual seeded spending.
                used_percentages = set()
                for category, expense in month_expenses:
                    low, high = limit_ranges[category]
                    target = ratios[categories.index(category)]
                    candidates = [
                        (low + (high - low) * Decimal(str(rng.random()))).quantize(Decimal("0.01"))
                        for _ in range(40)
                    ]
                    candidates.sort(key=lambda limit: abs(
                        float((expense.amount / limit) - target)
                    ))
                    limit = next(
                        (candidate for candidate in candidates
                         if round(float(expense.amount / candidate * 100), 1) not in used_percentages),
                        candidates[0],
                    )
                    percentage = round(float(expense.amount / limit * 100), 1)
                    used_percentages.add(percentage)
                    threshold = rng.choice([70, 75, 80, 85, 90])
                    Budget.objects.create(
                        user=user, month=month, category=category,
                        limit_amount=limit,
                        alert_threshold_percent=threshold,
                    )

            SavingsGoal.objects.create(
                user=user, name="Emergency fund", target_amount=Decimal("50000") * multiplier,
                saved_amount=Decimal("18500") * multiplier, deadline=today.replace(day=1),
            )
            SavingsGoal.objects.create(
                user=user, name="Technology upgrade", target_amount=Decimal("90000") * multiplier,
                saved_amount=Decimal("42000") * multiplier, deadline=shift_month(current, 4),
            )
            Notification.objects.create(
                user=user, type=Notification.Type.SAVINGS_REMINDER,
                title="Keep your savings momentum",
                message="Your demo account has a partially funded goal to help explore the dashboard.",
            )
        self.stdout.write(self.style.SUCCESS("Seeded demo student, premium, and admin accounts."))
