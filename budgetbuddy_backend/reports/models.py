from django.conf import settings
from django.db import models


class Report(models.Model):
    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        XLSX = "xlsx", "Excel"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    month = models.DateField(help_text="First day of the reported month")
    type = models.CharField(max_length=10, default="monthly")
    period = models.CharField(max_length=50, blank=True)
    format = models.CharField(max_length=4, choices=[("pdf", "PDF"), ("csv", "CSV"), ("xlsx", "Excel")])
    file = models.FileField(upload_to="reports/%Y/%m/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.month:%Y-%m} {self.format}"
