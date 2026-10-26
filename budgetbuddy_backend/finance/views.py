from datetime import date, datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from .models import Budget, Category, Expense, Income, SavingsGoal
from .serializers import (
    BudgetSerializer,
    ExpenseSerializer,
    IncomeSerializer,
    SavingsGoalSerializer,
)


def notify_budget_alerts(user, expense_date, category):
    try:
        month_start = date(expense_date.year, expense_date.month, 1)
        budgets = Budget.objects.filter(user=user, month=month_start)
        for b in budgets:
            if b.category and b.category != category:
                continue

            spent_qs = Expense.objects.filter(
                user=user,
                date__year=expense_date.year,
                date__month=expense_date.month,
            )
            if b.category:
                spent_qs = spent_qs.filter(category=b.category)
            spent = spent_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            pct = (float(spent) / float(b.limit_amount)) * 100 if b.limit_amount > 0 else 0
            cat_display = dict(Category.choices).get(b.category, "Overall")

            if spent > b.limit_amount:
                # Overspending alert
                title = f"Overspend Alert: {cat_display}"
                if not Notification.objects.filter(user=user, title=title, is_read=False).exists():
                    Notification.objects.create(
                        user=user,
                        type=Notification.Type.OVERSPEND,
                        title=title,
                        message=f"You have spent ₹{spent:.2f}, exceeding your {cat_display} budget limit of ₹{b.limit_amount:.2f} for {month_start.strftime('%B %Y')}.",
                    )
            elif pct >= b.alert_threshold_percent:
                title = f"Budget Alert: {cat_display} ({int(pct)}%)"
                if not Notification.objects.filter(user=user, title=title, is_read=False).exists():
                    Notification.objects.create(
                        user=user,
                        type=Notification.Type.BUDGET_ALERT,
                        title=title,
                        message=f"You have reached {pct:.1f}% of your {cat_display} budget (₹{spent:.2f} of ₹{b.limit_amount:.2f}).",
                    )
    except Exception:
        pass


def check_goal_milestones(user, goal):
    try:
        pct = goal.progress_percent
        if pct >= 100:
            if goal.status != SavingsGoal.Status.COMPLETED:
                goal.status = SavingsGoal.Status.COMPLETED
                goal.save(update_fields=["status"])
            title = f"Goal Achieved: {goal.name} 🎯"
            if not Notification.objects.filter(user=user, title=title, is_read=False).exists():
                Notification.objects.create(
                    user=user,
                    type=Notification.Type.GOAL_MILESTONE,
                    title=title,
                    message=f"Congratulations! You hit 100% of your target for '{goal.name}' (₹{goal.saved_amount:.2f} of ₹{goal.target_amount:.2f}).",
                )
        elif pct >= 50:
            title = f"Milestone: {goal.name} Halfway There! 🚀"
            if not Notification.objects.filter(user=user, title=title, is_read=False).exists():
                Notification.objects.create(
                    user=user,
                    type=Notification.Type.GOAL_MILESTONE,
                    title=title,
                    message=f"You have reached {pct:.1f}% of your goal for '{goal.name}' with ₹{goal.saved_amount:.2f} saved.",
                )
    except Exception:
        pass


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Income.objects.filter(user=self.request.user)
        source = self.request.query_params.get("source")
        if source:
            qs = qs.filter(source=source)
        month = self.request.query_params.get("month")
        if month:
            try:
                dt = datetime.strptime(month, "%Y-%m").date()
                qs = qs.filter(date__year=dt.year, date__month=dt.month)
            except ValueError:
                pass
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(note__icontains=search)
        return qs


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Expense.objects.filter(user=self.request.user)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        month = self.request.query_params.get("month")
        if month:
            try:
                dt = datetime.strptime(month, "%Y-%m").date()
                qs = qs.filter(date__year=dt.year, date__month=dt.month)
            except ValueError:
                pass
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(note__icontains=search)
        return qs

    def perform_create(self, serializer):
        expense = serializer.save(user=self.request.user)
        notify_budget_alerts(self.request.user, expense.date, expense.category)

    def perform_update(self, serializer):
        expense = serializer.save()
        notify_budget_alerts(self.request.user, expense.date, expense.category)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user)
        month = self.request.query_params.get("month")
        if month:
            try:
                dt = datetime.strptime(month, "%Y-%m").date()
                qs = qs.filter(month__year=dt.year, month__month=dt.month)
            except ValueError:
                pass
        return qs


class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def deposit(self, request, pk=None):
        goal = self.get_object()
        amount_raw = request.data.get("amount")
        try:
            amount = Decimal(str(amount_raw))
            if amount <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return Response(
                {"error": "A valid positive deposit amount is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        goal.saved_amount += amount
        if goal.saved_amount >= goal.target_amount:
            goal.status = SavingsGoal.Status.COMPLETED
        goal.save()

        check_goal_milestones(request.user, goal)
        return Response(self.get_serializer(goal).data)

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        goal = self.get_object()
        amount_raw = request.data.get("amount")
        try:
            amount = Decimal(str(amount_raw))
            if amount <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return Response(
                {"error": "A valid positive withdrawal amount is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amount > goal.saved_amount:
            return Response(
                {"error": "Withdrawal amount cannot exceed saved amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        goal.saved_amount -= amount
        if goal.saved_amount < goal.target_amount and goal.status == SavingsGoal.Status.COMPLETED:
            goal.status = SavingsGoal.Status.ACTIVE
        goal.save()

        return Response(self.get_serializer(goal).data)


class AnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        now = timezone.now().date()
        month_param = request.query_params.get("month")

        if month_param:
            try:
                selected_month = datetime.strptime(month_param, "%Y-%m").date()
            except ValueError:
                selected_month = date(now.year, now.month, 1)
        else:
            selected_month = date(now.year, now.month, 1)

        year = selected_month.year
        month = selected_month.month

        # Income for selected month
        income_qs = Income.objects.filter(user=user, date__year=year, date__month=month)
        total_income = income_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        # Expense for selected month
        expense_qs = Expense.objects.filter(user=user, date__year=year, date__month=month)
        total_expense = expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        net_savings = total_income - total_expense
        savings_rate = (
            round(float(net_savings) / float(total_income) * 100, 1)
            if total_income > 0
            else 0.0
        )

        # Category spending breakdown
        cat_choices = dict(Category.choices)
        cat_data = []
        cat_group = (
            expense_qs.values("category")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        for item in cat_group:
            cat_key = item["category"]
            amt = item["total"]
            pct = round(float(amt) / float(total_expense) * 100, 1) if total_expense > 0 else 0
            cat_data.append({
                "category": cat_key,
                "label": cat_choices.get(cat_key, cat_key.capitalize()),
                "amount": float(amt),
                "count": item["count"],
                "percentage": pct,
            })

        # Income source breakdown
        source_choices = dict(Income.Source.choices)
        source_data = []
        source_group = (
            income_qs.values("source")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        for item in source_group:
            src_key = item["source"]
            amt = item["total"]
            pct = round(float(amt) / float(total_income) * 100, 1) if total_income > 0 else 0
            source_data.append({
                "source": src_key,
                "label": source_choices.get(src_key, src_key.replace("_", " ").title()),
                "amount": float(amt),
                "count": item["count"],
                "percentage": pct,
            })

        # 6-Month Trajectory
        trends = []
        for i in range(5, -1, -1):
            # calculate month backwards
            target_date = selected_month - timedelta(days=i * 28)
            t_month_start = date(target_date.year, target_date.month, 1)
            inc = (
                Income.objects.filter(
                    user=user,
                    date__year=t_month_start.year,
                    date__month=t_month_start.month,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            exp = (
                Expense.objects.filter(
                    user=user,
                    date__year=t_month_start.year,
                    date__month=t_month_start.month,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            sav = inc - exp
            trends.append({
                "month": t_month_start.strftime("%Y-%m"),
                "label": t_month_start.strftime("%b %Y"),
                "income": float(inc),
                "expense": float(exp),
                "savings": float(sav),
            })

        # Budgets for current month
        budgets = Budget.objects.filter(user=user, month=selected_month)
        serialized_budgets = BudgetSerializer(budgets, many=True).data

        # Financial Health Score (0-100)
        # Factor 1: Savings rate up to 50 pts (target 20-30%)
        # Factor 2: Budget compliance up to 50 pts (not over budget)
        health_score = 50
        if total_income > 0:
            if savings_rate >= 30:
                health_score += 35
            elif savings_rate >= 15:
                health_score += 25
            elif savings_rate >= 0:
                health_score += 10
            else:
                health_score -= 20

        # Check overspending on budgets
        over_budget_count = sum(1 for b in serialized_budgets if b["is_over_budget"])
        if over_budget_count > 0:
            health_score -= 15 * over_budget_count
        else:
            health_score += 15

        health_score = max(5, min(99, health_score))

        return Response({
            "selected_month": selected_month.strftime("%Y-%m"),
            "summary": {
                "total_income": float(total_income),
                "total_expense": float(total_expense),
                "net_savings": float(net_savings),
                "savings_rate": savings_rate,
                "profile_income": float(getattr(user.profile, "monthly_income", 0) or 0),
                "financial_health_score": health_score,
            },
            "category_spending": cat_data,
            "income_sources": source_data,
            "monthly_trends": trends,
            "budgets": serialized_budgets,
        })
