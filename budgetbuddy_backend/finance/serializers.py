from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import Budget, Expense, Income, SavingsGoal


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = ("id", "source", "amount", "date", "note", "created_at")
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ("id", "category", "amount", "date", "note", "created_at")
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    spent_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    is_over_budget = serializers.SerializerMethodField()
    is_alert = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = (
            "id",
            "month",
            "category",
            "limit_amount",
            "alert_threshold_percent",
            "spent_amount",
            "percentage_used",
            "remaining_amount",
            "is_over_budget",
            "is_alert",
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
        )

    def _get_spent(self, obj):
        # Cache spent on object during serialization to avoid multiple queries
        if hasattr(obj, "_cached_spent"):
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
        remaining = obj.limit_amount - spent
        return f"{max(Decimal('0.00'), remaining):.2f}"

    def get_is_over_budget(self, obj):
        return self._get_spent(obj) > obj.limit_amount

    def get_is_alert(self, obj):
        pct = self.get_percentage_used(obj)
        return pct >= obj.alert_threshold_percent

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class SavingsGoalSerializer(serializers.ModelSerializer):
    progress_percent = serializers.ReadOnlyField()

    class Meta:
        model = SavingsGoal
        fields = (
            "id",
            "name",
            "target_amount",
            "saved_amount",
            "deadline",
            "status",
            "progress_percent",
            "created_at",
        )
        read_only_fields = ("id", "progress_percent", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
