from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    AnalyticsView,
    BudgetViewSet,
    ExpenseViewSet,
    IncomeViewSet,
    SavingsGoalViewSet,
)

router = DefaultRouter()
router.register("incomes", IncomeViewSet, basename="income")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("budgets", BudgetViewSet, basename="budget")
router.register("goals", SavingsGoalViewSet, basename="goal")

urlpatterns = [
    path("", include(router.urls)),
    path("analytics/", AnalyticsView.as_view(), name="finance-analytics"),
]
