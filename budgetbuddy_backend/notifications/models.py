from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        BUDGET_ALERT = "budget_alert", "Budget Alert"
        OVERSPEND = "overspend", "Overspending"
        SAVINGS_REMINDER = "savings_reminder", "Savings Reminder"
        MONTHLY_REPORT = "monthly_report", "Monthly Report"
        GOAL_MILESTONE = "goal_milestone", "Goal Milestone"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=120)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
