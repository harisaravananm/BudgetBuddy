from django.core.management.base import BaseCommand
from notifications.email_service import send_test_email


class Command(BaseCommand):
    help = "Send a real-time SMTP test email to verify email server connectivity."

    def add_arguments(self, parser):
        parser.add_argument(
            "--recipient",
            type=str,
            required=True,
            help="Email address to receive the test message.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        self.stdout.write(f"Initiating test email dispatch to {recipient}...")
        try:
            thread = send_test_email(recipient_email=recipient)
            if thread:
                thread.join(timeout=10)
            self.stdout.write(
                self.style.SUCCESS(f"Real-time test email dispatched to {recipient}. Check inbox/spam or console log.")
            )
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Failed to dispatch email: {exc}"))

