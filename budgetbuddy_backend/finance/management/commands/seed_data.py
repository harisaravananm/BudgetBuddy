from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.models import Budget, Category, Expense, Income, SavingsGoal
from notifications.models import Notification
from users.models import User


class Command(BaseCommand):
    help = "Seeds database with realistic student, premium, and admin accounts with complete finance records"

    def handle(self, *args, **options):
        self.stdout.write("Seeding BudgetBuddy database...")

        today = timezone.now().date()
        current_month_start = date(today.year, today.month, 1)

        # 1. Create Student User
        student, created = User.objects.get_or_create(
            email="student@budgetbuddy.local",
            defaults={"role": User.Role.STUDENT},
        )
        student.set_password("Student123!")
        student.role = User.Role.STUDENT
        student.save()
        student.profile.full_name = "Aarav Sharma"
        student.profile.monthly_income = Decimal("25000.00")
        student.profile.currency = "INR"
        student.profile.savings_target_percent = 25
        student.profile.save()

        # 2. Create Premium User
        premium, _ = User.objects.get_or_create(
            email="premium@budgetbuddy.local",
            defaults={"role": User.Role.PREMIUM},
        )
        premium.set_password("Premium123!")
        premium.role = User.Role.PREMIUM
        premium.save()
        premium.profile.full_name = "Riya Patel"
        premium.profile.monthly_income = Decimal("65000.00")
        premium.profile.currency = "INR"
        premium.profile.savings_target_percent = 35
        premium.profile.save()

        # 3. Create Admin User
        admin, _ = User.objects.get_or_create(
            email="admin@budgetbuddy.local",
            defaults={"role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin.set_password("Admin123!")
        admin.role = User.Role.ADMIN
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        admin.profile.full_name = "BudgetBuddy Admin"
        admin.profile.monthly_income = Decimal("80000.00")
        admin.profile.save()

        # Seed data for Student User
        # Clean existing records for student to ensure idempotency
        Income.objects.filter(user=student).delete()
        Expense.objects.filter(user=student).delete()
        Budget.objects.filter(user=student).delete()
        SavingsGoal.objects.filter(user=student).delete()
        Notification.objects.filter(user=student).delete()

        # Incomes for current month
        Income.objects.create(
            user=student,
            source=Income.Source.POCKET_MONEY,
            amount=Decimal("12000.00"),
            date=current_month_start + timedelta(days=1),
            note="Monthly allowance from parents",
        )
        Income.objects.create(
            user=student,
            source=Income.Source.SCHOLARSHIP,
            amount=Decimal("6000.00"),
            date=current_month_start + timedelta(days=4),
            note="Merit-cum-means semester stipend",
        )
        Income.objects.create(
            user=student,
            source=Income.Source.FREELANCE,
            amount=Decimal("7000.00"),
            date=current_month_start + timedelta(days=11),
            note="Campus club website design project",
        )

        # Incomes for previous 3 months (for trajectory)
        for m_offset in range(1, 4):
            prev_m_date = current_month_start - timedelta(days=m_offset * 30)
            p_start = date(prev_m_date.year, prev_m_date.month, 1)
            Income.objects.create(
                user=student,
                source=Income.Source.POCKET_MONEY,
                amount=Decimal("12000.00"),
                date=p_start + timedelta(days=1),
                note="Monthly allowance",
            )
            Income.objects.create(
                user=student,
                source=Income.Source.FREELANCE,
                amount=Decimal(str(5000 + m_offset * 1000)),
                date=p_start + timedelta(days=10),
                note="Freelance programming & tutoring",
            )

        # Expenses for current month
        expenses_data = [
            (Category.FOOD, Decimal("3200.00"), 2, "Campus mess card & weekly groceries"),
            (Category.FOOD, Decimal("850.00"), 8, "Weekend dinner with project team"),
            (Category.TRAVEL, Decimal("1400.00"), 3, "Monthly metro pass recharge"),
            (Category.EDUCATION, Decimal("2100.00"), 5, "Algorithms textbook & Coursera certificate"),
            (Category.SHOPPING, Decimal("1750.00"), 10, "Semester stationery and backpack"),
            (Category.ENTERTAINMENT, Decimal("650.00"), 14, "Movie ticket and weekend snacks"),
            (Category.MISC, Decimal("450.00"), 7, "Mobile phone data recharge"),
        ]
        for cat, amt, day_off, note in expenses_data:
            Expense.objects.create(
                user=student,
                category=cat,
                amount=amt,
                date=current_month_start + timedelta(days=min(day_off, 25)),
                note=note,
            )

        # Expenses for previous 3 months
        for m_offset in range(1, 4):
            prev_m_date = current_month_start - timedelta(days=m_offset * 30)
            p_start = date(prev_m_date.year, prev_m_date.month, 1)
            Expense.objects.create(
                user=student,
                category=Category.FOOD,
                amount=Decimal("3800.00"),
                date=p_start + timedelta(days=5),
                note="Monthly food and snacks",
            )
            Expense.objects.create(
                user=student,
                category=Category.TRAVEL,
                amount=Decimal("1200.00"),
                date=p_start + timedelta(days=6),
                note="Metro and auto fares",
            )
            Expense.objects.create(
                user=student,
                category=Category.EDUCATION,
                amount=Decimal("1900.00"),
                date=p_start + timedelta(days=12),
                note="Course materials and lab notes",
            )
            Expense.objects.create(
                user=student,
                category=Category.ENTERTAINMENT,
                amount=Decimal("950.00"),
                date=p_start + timedelta(days=18),
                note="Concert & outing",
            )

        # Budgets for current month
        Budget.objects.create(
            user=student,
            month=current_month_start,
            category="",
            limit_amount=Decimal("16000.00"),
            alert_threshold_percent=80,
        )
        Budget.objects.create(
            user=student,
            month=current_month_start,
            category=Category.FOOD,
            limit_amount=Decimal("5000.00"),
            alert_threshold_percent=75,
        )
        Budget.objects.create(
            user=student,
            month=current_month_start,
            category=Category.TRAVEL,
            limit_amount=Decimal("2000.00"),
            alert_threshold_percent=80,
        )
        Budget.objects.create(
            user=student,
            month=current_month_start,
            category=Category.EDUCATION,
            limit_amount=Decimal("3000.00"),
            alert_threshold_percent=80,
        )
        Budget.objects.create(
            user=student,
            month=current_month_start,
            category=Category.ENTERTAINMENT,
            limit_amount=Decimal("1200.00"),
            alert_threshold_percent=70,
        )

        # Savings Goals
        SavingsGoal.objects.create(
            user=student,
            name="New Laptop Fund",
            target_amount=Decimal("60000.00"),
            saved_amount=Decimal("38000.00"),
            deadline=today + timedelta(days=90),
            status=SavingsGoal.Status.ACTIVE,
        )
        SavingsGoal.objects.create(
            user=student,
            name="Japan Trip Fund",
            target_amount=Decimal("85000.00"),
            saved_amount=Decimal("24500.00"),
            deadline=today + timedelta(days=240),
            status=SavingsGoal.Status.ACTIVE,
        )
        SavingsGoal.objects.create(
            user=student,
            name="Emergency Savings",
            target_amount=Decimal("20000.00"),
            saved_amount=Decimal("16500.00"),
            deadline=today + timedelta(days=45),
            status=SavingsGoal.Status.ACTIVE,
        )

        # Notifications
        Notification.objects.create(
            user=student,
            type=Notification.Type.BUDGET_ALERT,
            title="Budget Alert: Food (81%)",
            message="You have utilized 81% of your ₹5,000 Food budget for this month. 12 days remaining.",
            is_read=False,
        )
        Notification.objects.create(
            user=student,
            type=Notification.Type.GOAL_MILESTONE,
            title="Milestone: New Laptop Fund Halfway There! 🚀",
            message="Great discipline! You have surpassed 63% of your New Laptop goal (₹38,000 saved).",
            is_read=False,
        )
        Notification.objects.create(
            user=student,
            type=Notification.Type.SAVINGS_REMINDER,
            title="Smart Savings Tip 💡",
            message="You have ₹14,600 net balance this month. Allocate 20% to your Emergency Fund!",
            is_read=True,
        )
        Notification.objects.create(
            user=student,
            type=Notification.Type.MONTHLY_REPORT,
            title="Monthly Statement Available",
            message="Your complete financial statement for the previous cycle is ready for PDF/Excel download.",
            is_read=True,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Successfully seeded BudgetBuddy with Student, Premium, and Admin accounts!"
            )
        )
