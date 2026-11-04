import logging
import threading
from decimal import Decimal
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger("notifications.email")


def _send_email_async(subject, plain_text, html_content, recipient_email):
    """Deliver an email in a background thread to prevent blocking HTTP requests."""
    def task():
        try:
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "BudgetBuddy <noreply@budgetbuddy.local>")
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[recipient_email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info("Real-time email sent successfully to %s: '%s'", recipient_email, subject)
        except Exception as exc:
            logger.error("Failed to send real-time email to %s: %s", recipient_email, exc)

    thread = threading.Thread(target=task, daemon=True)
    thread.start()
    return thread


def _get_base_template(title, badge_text, badge_color, intro_text, detail_rows, action_url=None, action_label="Open BudgetBuddy"):
    """Generate a clean, responsive HTML email template for financial alerts."""
    rows_html = "".join([
        f"""
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">{label}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">{value}</td>
        </tr>
        """
        for label, value in detail_rows
    ])

    button_html = f"""
    <div style="margin: 28px 0 10px 0; text-align: center;">
        <a href="{action_url or getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')}" 
           style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
           {action_label} &rarr;
        </a>
    </div>
    """ if action_url else ""

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background-color: #0b0f19; padding: 22px 28px; border-bottom: 1px solid #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: #ffffff; font-weight: 800; font-size: 18px; letter-spacing: -0.5px;">BudgetBuddy</span>
                <span style="background-color: {badge_color}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                    {badge_text}
                </span>
            </div>
        </div>
        <!-- Content -->
        <div style="padding: 28px;">
            <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">{title}</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">{intro_text}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                {rows_html}
            </table>
            
            {button_html}
        </div>
        <!-- Footer -->
        <div style="padding: 16px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
            <p style="margin: 0;">This is an automated real-time notification from your BudgetBuddy personal finance platform.</p>
            <p style="margin: 4px 0 0 0;">Manage your notification settings or threshold % in your account settings.</p>
        </div>
    </div>
</body>
</html>
"""


def send_budget_warning_email(user, budget, spent, limit, percentage):
    """Triggered when spending reaches user's warning threshold (e.g. 80%)."""
    profile = getattr(user, "profile", None)
    if profile and not getattr(profile, "email_notifications_enabled", True):
        logger.info("Email notifications disabled for user %s; skipping warning email", user.email)
        return None

    cat_name = budget.get_category_display() if hasattr(budget, "get_category_display") else str(budget.category).title()
    subject = f"⚠️ Budget Warning: {cat_name} spending has reached {percentage:.1f}%"
    intro = f"Hello {profile.full_name or user.email}, your spending in <strong>{cat_name}</strong> has reached {percentage:.1f}% of your allocated monthly budget limit."
    
    details = [
        ("Category", cat_name),
        ("Current Spent", f"₹{spent:.2f}"),
        ("Budget Limit", f"₹{limit:.2f}"),
        ("Remaining Buffer", f"₹{max(0, limit - spent):.2f}"),
        ("Utilization", f"{percentage:.1f}%"),
        ("Alert Threshold", f"{getattr(budget, 'alert_threshold_percent', 80)}%"),
    ]

    plain = (
        f"Budget Warning for {cat_name}\n\n"
        f"You have reached {percentage:.1f}% of your {cat_name} budget limit.\n"
        f"Spent: ₹{spent:.2f} / Limit: ₹{limit:.2f}\n"
        f"Remaining: ₹{max(0, limit - spent):.2f}\n\n"
        f"Visit BudgetBuddy to review your expenses."
    )
    html = _get_base_template(
        title=f"Budget Alert: {cat_name} at {percentage:.1f}%",
        badge_text="Warning",
        badge_color="#f59e0b",
        intro_text=intro,
        detail_rows=details,
        action_url=getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173"),
        action_label="Review Budgets",
    )
    return _send_email_async(subject, plain, html, user.email)


def send_budget_exceeded_email(user, budget, spent, limit, percentage):
    """Triggered when spending exceeds 100% of the category budget limit."""
    profile = getattr(user, "profile", None)
    if profile and not getattr(profile, "email_notifications_enabled", True):
        logger.info("Email notifications disabled for user %s; skipping exceeded email", user.email)
        return None

    cat_name = budget.get_category_display() if hasattr(budget, "get_category_display") else str(budget.category).title()
    over_by = spent - limit
    subject = f"🚨 Overspending Alert: {cat_name} budget exceeded ({percentage:.1f}%)"
    intro = f"Attention {profile.full_name or user.email}, you have exceeded your monthly budget for <strong>{cat_name}</strong> by <strong>₹{over_by:.2f}</strong>."

    details = [
        ("Category", cat_name),
        ("Total Spent", f"₹{spent:.2f}"),
        ("Budget Limit", f"₹{limit:.2f}"),
        ("Amount Over Budget", f"₹{over_by:.2f}"),
        ("Utilization", f"{percentage:.1f}%"),
        ("Date", timezone.localtime().strftime("%B %d, %Y %I:%M %p")),
    ]

    plain = (
        f"OVERSPENDING ALERT: {cat_name}\n\n"
        f"You have exceeded your monthly budget for {cat_name} by ₹{over_by:.2f}.\n"
        f"Total Spent: ₹{spent:.2f} | Limit: ₹{limit:.2f} ({percentage:.1f}%)\n\n"
        f"Log in to BudgetBuddy to reallocate funds or pause non-essential expenses."
    )
    html = _get_base_template(
        title=f"Budget Exceeded: {cat_name}",
        badge_text="Over Budget",
        badge_color="#e11d48",
        intro_text=intro,
        detail_rows=details,
        action_url=getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173"),
        action_label="Adjust Your Budget",
    )
    return _send_email_async(subject, plain, html, user.email)


def send_large_expense_email(user, expense):
    """Triggered in real-time when an expense exceeds user's large expense threshold."""
    profile = getattr(user, "profile", None)
    if profile:
        if not getattr(profile, "email_notifications_enabled", True):
            return None
        if not getattr(profile, "large_expense_alert_enabled", True):
            return None

    cat_name = expense.get_category_display() if hasattr(expense, "get_category_display") else str(expense.category).title()
    subject = f"💳 Large Expense Alert: ₹{expense.amount:.2f} recorded in {cat_name}"
    intro = f"Hello {profile.full_name or user.email}, a new transaction of <strong>₹{expense.amount:.2f}</strong> was logged under {cat_name}."

    details = [
        ("Expense Amount", f"₹{expense.amount:.2f}"),
        ("Category", cat_name),
        ("Date", str(expense.date)),
        ("Description / Note", expense.note or "No note provided"),
        ("Threshold Trigger", f"₹{getattr(profile, 'large_expense_threshold', Decimal('5000.00')):.2f}"),
    ]

    plain = (
        f"Large Expense Logged\n\n"
        f"Amount: ₹{expense.amount:.2f}\n"
        f"Category: {cat_name}\n"
        f"Date: {expense.date}\n"
        f"Note: {expense.note or 'N/A'}\n\n"
        f"Check your dashboard to view the impact on your monthly budget."
    )
    html = _get_base_template(
        title="Large Expense Recorded",
        badge_text="Large Transaction",
        badge_color="#7c3aed",
        intro_text=intro,
        detail_rows=details,
        action_url=getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173"),
        action_label="View Transaction History",
    )
    return _send_email_async(subject, plain, html, user.email)


def send_test_email(recipient_email, user=None):
    """Send a real-time verification email to confirm SMTP/SendGrid configuration."""
    backend_name = getattr(settings, "EMAIL_BACKEND", "")
    host = getattr(settings, "EMAIL_HOST", "localhost")
    port = getattr(settings, "EMAIL_PORT", 587)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "BudgetBuddy")

    subject = "✅ BudgetBuddy: Real-Time SMTP Email Verification"
    intro = f"Congratulations! Your BudgetBuddy real-time email notification service is successfully connected and transmitting."

    details = [
        ("Recipient", recipient_email),
        ("Email Backend", backend_name.split(".")[-1]),
        ("SMTP Server", host),
        ("Port", str(port)),
        ("Sender Address", from_email),
        ("Timestamp", timezone.localtime().strftime("%Y-%m-%d %H:%M:%S %Z")),
    ]

    plain = (
        f"BudgetBuddy SMTP Verification\n\n"
        f"Your real-time email notifications are working successfully!\n"
        f"Recipient: {recipient_email}\n"
        f"Backend: {backend_name}\n"
        f"SMTP Server: {host}:{port}\n"
    )
    html = _get_base_template(
        title="SMTP Email Service Active",
        badge_text="Verified",
        badge_color="#059669",
        intro_text=intro,
        detail_rows=details,
        action_url=getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173"),
        action_label="Open Dashboard",
    )
    return _send_email_async(subject, plain, html, recipient_email)

