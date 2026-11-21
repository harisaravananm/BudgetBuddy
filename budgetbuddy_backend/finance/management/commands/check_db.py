import time
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Verify database connectivity, measure latency, and report engine/Supabase status."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== BudgetBuddy Database Diagnostics ==="))
        db_conf = settings.DATABASES["default"]
        engine = db_conf.get("ENGINE", "")
        is_postgres = "postgresql" in engine
        is_sqlite = "sqlite" in engine

        self.stdout.write(f"Configured Engine: {engine}")
        if is_postgres:
            host = db_conf.get("HOST", "localhost")
            port = db_conf.get("PORT", "5432")
            name = db_conf.get("NAME", "")
            user = db_conf.get("USER", "")
            is_supabase = "supabase" in host.lower()
            self.stdout.write(f"Target Database:   {name}")
            self.stdout.write(f"Target Host:       {host}:{port}")
            self.stdout.write(f"Database User:     {user}")
            if is_supabase:
                self.stdout.write(self.style.SUCCESS("Cloud Provider:    Supabase Managed PostgreSQL Detected!"))
            sslmode = db_conf.get("OPTIONS", {}).get("sslmode", "default")
            self.stdout.write(f"SSL Mode:          {sslmode}")
        elif is_sqlite:
            self.stdout.write(f"SQLite File:       {db_conf.get('NAME')}")
            self.stdout.write("Running on local SQLite storage (development mode).")

        self.stdout.write("Testing live database connection...")
        try:
            start = time.perf_counter()
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
                
                version_str = "Unknown"
                if is_postgres:
                    cursor.execute("SELECT version();")
                    version_str = cursor.fetchone()[0]
                elif is_sqlite:
                    cursor.execute("SELECT sqlite_version();")
                    version_str = f"SQLite {cursor.fetchone()[0]}"
            elapsed_ms = (time.perf_counter() - start) * 1000

            self.stdout.write(self.style.SUCCESS(f" Connection established successfully!"))
            self.stdout.write(f"Roundtrip Latency: {elapsed_ms:.2f} ms")
            self.stdout.write(f"Server Version:    {version_str}")

            # Report table statistics
            from users.models import User
            from finance.models import Income, Expense, Budget, SavingsGoal
            from notifications.models import Notification

            self.stdout.write("\nTable Record Summary:")
            self.stdout.write(f" - Users:         {User.objects.count()}")
            self.stdout.write(f" - Incomes:       {Income.objects.count()}")
            self.stdout.write(f" - Expenses:      {Expense.objects.count()}")
            self.stdout.write(f" - Budgets:       {Budget.objects.count()}")
            self.stdout.write(f" - Savings Goals: {SavingsGoal.objects.count()}")
            self.stdout.write(f" - Notifications: {Notification.objects.count()}")

            self.stdout.write(self.style.SUCCESS("\n[OK] Database is healthy and operational.\n"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"\n[FAIL] Database connection failed: {exc}\n"))
            if is_postgres:
                self.stdout.write(self.style.WARNING("Supabase Troubleshooting Tips:"))
                self.stdout.write("1. Check if your Supabase project is active (not paused).")
                self.stdout.write("2. Verify your password in DATABASE_URL or SUPABASE_DB_URL.")
                self.stdout.write("3. Supabase requires sslmode=require. Ensure connection string has sslmode=require.")
                self.stdout.write("4. For pooled connections, use port 6543 (e.g., aws-0-*.pooler.supabase.com:6543).")
                self.stdout.write("5. If using IPv4 only networks, use Supabase connection pooler URL.\n")
            raise SystemExit(1)

