from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.models import Budget, Expense, SavingsGoal
from finance.views import check_goal_milestones, notify_budget_alerts


class Command(BaseCommand):
    help = "Recalculate budget alerts and upcoming savings-goal reminders."

    def handle(self, *args, **options):
        today = timezone.localdate()
        for budget in Budget.objects.filter(month__year=today.year, month__month=today.month).select_related("user"):
            notify_budget_alerts(budget.user, today, budget.category)
        for goal in SavingsGoal.objects.exclude(status=SavingsGoal.Status.COMPLETED).select_related("user"):
            check_goal_milestones(goal.user, goal)
            if goal.deadline and today <= goal.deadline <= today + timedelta(days=7):
                key = f"goal:{goal.id}:deadline:{goal.deadline}"
                from notifications.models import Notification
                if goal.user.profile.notifications_enabled and not Notification.objects.filter(user=goal.user, related_object=key).exists():
                    Notification.objects.create(user=goal.user, type=Notification.Type.GOAL_DEADLINE,
                                                title=f"Goal deadline soon: {goal.name}",
                                                message=f"Your goal deadline is {goal.deadline}.",
                                                related_object=key)
        self.stdout.write(self.style.SUCCESS("Budget and goal alerts checked."))
