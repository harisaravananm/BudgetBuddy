from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import Budget, Expense, GoalContribution, Income, SavingsGoal


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = ("id", "source", "amount", "date", "note", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ("id", "category", "amount", "date", "note", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    spent_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    is_over_budget = serializers.SerializerMethodField()
    is_alert = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = (
            "id",
            "month",
            "category",
            "limit_amount",
            "alert_threshold_percent",
            "updated_at",
            "spent_amount",
            "percentage_used",
            "remaining_amount",
            "is_over_budget",
            "is_alert",
            "status",
            "created_at",
        )
        read_only_fields = (
            "id",
            "spent_amount",
            "percentage_used",
            "remaining_amount",
            "is_over_budget",
            "is_alert",
            "created_at",
            "updated_at",
        )

    def _get_spent(self, obj):
        # Cache spent on object during serialization to avoid multiple queries
        if hasattr(obj, "_cached_spent"):
            return obj._cached_spent

        if hasattr(obj, "spent_total"):
            obj._cached_spent = obj.spent_total or Decimal("0.00")
            return obj._cached_spent

        month = obj.month
        year = month.year
        month_num = month.month
        qs = Expense.objects.filter(
            user=obj.user,
            date__year=year,
            date__month=month_num,
        )
        if obj.category:
            qs = qs.filter(category=obj.category)
        total = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        obj._cached_spent = total
        return total

    def get_spent_amount(self, obj):
        return f"{self._get_spent(obj):.2f}"

    def get_percentage_used(self, obj):
        spent = self._get_spent(obj)
        limit = obj.limit_amount
        if not limit or limit <= 0:
            return 0.0
        return round(float(spent) / float(limit) * 100, 1)

    def get_remaining_amount(self, obj):
        spent = self._get_spent(obj)
        return f"{obj.limit_amount - spent:.2f}"

    def get_is_over_budget(self, obj):
        return self._get_spent(obj) > obj.limit_amount

    def get_is_alert(self, obj):
        pct = self.get_percentage_used(obj)
        return pct >= obj.alert_threshold_percent

    def get_status(self, obj):
        pct = self.get_percentage_used(obj)
        if pct > 100:
            return "exceeded"
        if pct >= obj.alert_threshold_percent:
            return "warning"
        return "safe"

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class SavingsGoalSerializer(serializers.ModelSerializer):
    current_amount = serializers.DecimalField(source="saved_amount", max_digits=12, decimal_places=2, required=False)
    progress_percent = serializers.ReadOnlyField()
    progress_pct = serializers.ReadOnlyField(source="progress_percent")
    remaining = serializers.SerializerMethodField()
    days_left = serializers.SerializerMethodField()
    required_monthly_saving = serializers.SerializerMethodField()
    on_track = serializers.SerializerMethodField()
    saved_amount = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = (
            "id",
            "name",
            "target_amount",
            "current_amount",
            "saved_amount",
            "deadline",
            "priority",
            "icon",
            "status",
            "progress_percent",
            "progress_pct",
            "remaining",
            "days_left",
            "required_monthly_saving",
            "on_track",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "progress_percent", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def get_remaining(self, obj):
        return f"{max(obj.target_amount - obj.current_amount, Decimal('0')):.2f}"

    def get_saved_amount(self, obj):
        return f"{obj.current_amount:.2f}"

    def get_days_left(self, obj):
        if not obj.deadline:
            return None
        from django.utils import timezone
        return max((obj.deadline - timezone.localdate()).days, 0)

    def get_required_monthly_saving(self, obj):
        days = self.get_days_left(obj)
        if not days:
            return "0.00"
        months = max(1, (days + 29) // 30)
        return f"{max(obj.target_amount - obj.current_amount, Decimal('0')) / months:.2f}"

    def get_on_track(self, obj):
        if not obj.deadline or obj.status == SavingsGoal.Status.COMPLETED:
            return True
        from django.utils import timezone
        elapsed = max((timezone.localdate() - obj.created_at.date()).days, 1)
        total = max((obj.deadline - obj.created_at.date()).days, 1)
        return float(obj.current_amount / obj.target_amount) >= min(elapsed / total, 1)


class GoalContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalContribution
        fields = ("id", "amount", "date", "note")
        read_only_fields = ("id",)
