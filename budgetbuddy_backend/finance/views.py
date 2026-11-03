from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.db.models import Case, Count, DecimalField, OuterRef, Subquery, Sum, When
from django.db.models.functions import TruncMonth
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


def _filter_date_range(queryset, request):
    for parameter, lookup in (("date_from", "date__gte"), ("date_to", "date__lte")):
        value = request.query_params.get(parameter)
        if value:
            try:
                queryset = queryset.filter(**{lookup: datetime.strptime(value, "%Y-%m-%d").date()})
            except ValueError:
                pass
    return queryset


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Income.objects.select_related("user").filter(user=self.request.user)
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
        qs = _filter_date_range(qs, self.request)
        return qs

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Expense.objects.select_related("user").filter(user=self.request.user)
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
        qs = _filter_date_range(qs, self.request)
        return qs

    def perform_create(self, serializer):
        expense = serializer.save(user=self.request.user)
        notify_budget_alerts(self.request.user, expense.date, expense.category)

    def perform_update(self, serializer):
        expense = serializer.save()
        notify_budget_alerts(self.request.user, expense.date, expense.category)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        category_totals = (
            Expense.objects.filter(user=OuterRef("user"))
            .annotate(expense_month=TruncMonth("date"))
            .filter(expense_month=OuterRef("month"), category=OuterRef("category"))
            .values("expense_month")
            .annotate(total=Sum("amount"))
            .values("total")[:1]
        )
        overall_totals = (
            Expense.objects.filter(user=OuterRef("user"))
            .annotate(expense_month=TruncMonth("date"))
            .filter(expense_month=OuterRef("month"))
            .values("expense_month")
            .annotate(total=Sum("amount"))
            .values("total")[:1]
        )
        qs = Budget.objects.select_related("user").filter(user=self.request.user).annotate(
            spent_total=Case(
                When(category="", then=Subquery(overall_totals)),
                default=Subquery(category_totals),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
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
        return SavingsGoal.objects.select_related("user").filter(user=self.request.user)

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


class DashboardSummaryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        current_start = today.replace(day=1)
        income_qs = Income.objects.filter(user=user, date__range=(current_start, today))
        expense_qs = Expense.objects.filter(user=user, date__range=(current_start, today))
        inflow = income_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        spent = expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        net = inflow - spent
        savings_rate = round(float(net / inflow * 100), 1) if inflow else 0.0
        has_data = bool(inflow or spent)

        labels = dict(Category.choices)
        breakdown = []
        for item in expense_qs.values("category").annotate(total=Sum("amount"), count=Count("id")).order_by("-total"):
            breakdown.append({
                "category": item["category"],
                "label": labels.get(item["category"], item["category"]),
                "amount": float(item["total"]),
                "count": item["count"],
                "percentage": round(float(item["total"] / spent * 100), 1) if spent else 0.0,
            })

        budget_rows = []
        budget_spend = {
            row["category"]: row["total"]
            for row in expense_qs.values("category").annotate(total=Sum("amount"))
        }
        budgets = list(Budget.objects.filter(user=user, month=current_start).order_by("category"))
        for budget in budgets:
            spent_for_budget = (
                sum(budget_spend.values())
                if not budget.category
                else budget_spend.get(budget.category, Decimal("0.00"))
            )
            budget_rows.append({
                "category": budget.category or "overall",
                "limit": float(budget.limit_amount),
                "spent": float(spent_for_budget),
                "utilization": round(float(spent_for_budget / budget.limit_amount * 100), 1),
                "limit_amount": float(budget.limit_amount),
                "spent_amount": float(spent_for_budget),
                "percentage_used": round(float(spent_for_budget / budget.limit_amount * 100), 1),
                "is_over_budget": spent_for_budget > budget.limit_amount,
            })

        six_month_start = (current_start - timedelta(days=155)).replace(day=1)
        income_trend = {
            row["month"]: row["total"]
            for row in Income.objects.filter(
                user=user, date__gte=six_month_start, date__lte=today
            ).annotate(month=TruncMonth("date")).values("month").annotate(total=Sum("amount"))
        }
        expense_trend = {
            row["month"]: row["total"]
            for row in Expense.objects.filter(
                user=user, date__gte=six_month_start, date__lte=today
            ).annotate(month=TruncMonth("date")).values("month").annotate(total=Sum("amount"))
        }
        trend = []
        month = six_month_start
        for _ in range(6):
            inc = income_trend.get(month, Decimal("0.00"))
            exp = expense_trend.get(month, Decimal("0.00"))
            trend.append({
                "month": month.strftime("%Y-%m"),
                "inflow": float(inc),
                "spent": float(exp),
                "net_savings": float(inc - exp),
            })
            month_number = month.month % 12 + 1
            year = month.year + (month.month // 12)
            month = date(year, month_number, 1)

        discipline = None
        if has_data:
            budget_score = 100
            if budget_rows:
                budget_score = max(0, 100 - sum(max(0, row["utilization"] - 100) for row in budget_rows))
            days_in_month = monthrange(today.year, today.month)[1]
            expected_spend_share = today.day / days_in_month
            actual_spend_share = float(spent / inflow) if inflow else 1.0
            pace_score = max(0, min(100, 100 - max(
                0, actual_spend_share - expected_spend_share
            ) * 100))
            goal_data = SavingsGoal.objects.filter(user=user).aggregate(
                saved=Sum("saved_amount"), target=Sum("target_amount")
            )
            goal_progress = (
                min(100, float(goal_data["saved"] / goal_data["target"] * 100))
                if goal_data["target"] else 0
            )
            discipline = round(max(0, min(100, (
                budget_score * 0.4
                + max(0, min(100, savings_rate)) * 0.3
                + pace_score * 0.2
                + goal_progress * 0.1
            ))), 1)
        summary = {
            "total_income": float(inflow),
            "total_expense": float(spent),
            "net_savings": float(net),
            "savings_rate": savings_rate,
            "financial_health_score": discipline,
        }
        return Response({
            "inflow": float(inflow),
            "spent": float(spent),
            "net_savings": float(net),
            "savings_rate": savings_rate,
            "spending_velocity": round(float(spent / max(today.day, 1)), 2),
            "discipline_score": discipline,
            "category_breakdown": breakdown,
            "budget_utilization": budget_rows,
            "last_6_month_trend": trend,
            "summary": summary,
            "category_spending": breakdown,
            "monthly_trends": [
                {
                    "label": row["month"],
                    "income": row["inflow"],
                    "expense": row["spent"],
                    "savings": row["net_savings"],
                }
                for row in trend
            ],
            "budgets": budget_rows,
        })


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
