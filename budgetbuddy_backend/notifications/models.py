from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        BUDGET_WARNING = "budget_warning", "Budget Warning"
        BUDGET_EXCEEDED = "budget_exceeded", "Budget Exceeded"
        GOAL_MILESTONE = "goal_milestone", "Goal Milestone"
        GOAL_COMPLETED = "goal_completed", "Goal Completed"
        GOAL_DEADLINE = "goal_deadline", "Goal Deadline"
        REPORT_READY = "report_ready", "Report Ready"
        LARGE_EXPENSE = "large_expense", "Large Expense"
        EMAIL_SENT = "email_sent", "Email Sent"
        SYSTEM = "system", "System"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=120)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_object = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read", "created_at"])]

    def __str__(self):
        return self.title
