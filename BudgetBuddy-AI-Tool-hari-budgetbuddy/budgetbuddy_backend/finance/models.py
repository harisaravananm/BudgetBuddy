from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

User = settings.AUTH_USER_MODEL
POSITIVE = [MinValueValidator(0.01)]


class Category(models.TextChoices):
    FOOD = "food", "Food"
    TRANSPORT = "transport", "Transport"
    RENT = "rent", "Rent / Hostel"
    BOOKS = "books", "Books"
    TRAVEL = "travel", "Travel"
    SHOPPING = "shopping", "Shopping"
    EDUCATION = "education", "Education"
    ENTERTAINMENT = "entertainment", "Entertainment"
    SUBSCRIPTIONS = "subscriptions", "Subscriptions"
    HEALTH = "health", "Health"
    MISC = "misc", "Miscellaneous"
    BILLS = "bills", "Bills & Utilities"


class ActiveTransactionManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class Income(models.Model):
    class Source(models.TextChoices):
        POCKET_MONEY = "pocket_money", "Pocket Money"
        SCHOLARSHIP = "scholarship", "Scholarship"
        FREELANCE = "freelance", "Freelance"
        OTHER = "other", "Other"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="incomes")
    source = models.CharField(max_length=20, choices=Source.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=POSITIVE)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    objects = ActiveTransactionManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "is_deleted", "date"]),
        ]

    def __str__(self):
        return f"{self.source} {self.amount}"


class Expense(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expenses")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.MISC)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=POSITIVE)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    objects = ActiveTransactionManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category", "date"]),
            models.Index(fields=["user", "is_deleted", "date"]),
        ]

    def __str__(self):
        return f"{self.category} {self.amount}"


class Budget(models.Model):
    """Monthly budget. category=None means the overall monthly limit."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    month = models.DateField(help_text="First day of the month")
    category = models.CharField(max_length=20, choices=Category.choices, blank=True, default="")
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=POSITIVE)
    alert_threshold_percent = models.PositiveSmallIntegerField(default=80)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-month"]
        constraints = [models.UniqueConstraint(fields=["user", "month", "category"], name="uniq_budget")]
        indexes = [models.Index(fields=["user", "month", "category"])]

    def __str__(self):
        return f"{self.month:%Y-%m} {self.category or 'overall'}"


class SavingsGoal(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="goals")
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=POSITIVE)
    saved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium")
    icon = models.CharField(max_length=40, default="target")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"])]

    @property
    def progress_percent(self):
        return min(100, round(float(self.current_amount) / float(self.target_amount) * 100, 1))

    @property
    def current_amount(self):
        return self.saved_amount

    @current_amount.setter
    def current_amount(self, value):
        self.saved_amount = value

    def __str__(self):
        return self.name


class GoalContribution(models.Model):
    goal = models.ForeignKey(SavingsGoal, on_delete=models.CASCADE, related_name="contributions")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=POSITIVE)
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [models.Index(fields=["goal", "date"])]
