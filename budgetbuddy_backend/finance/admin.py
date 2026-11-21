from django.contrib import admin
from .models import Budget, Expense, GoalContribution, Income, SavingsGoal

for m in (Income, Expense, Budget, SavingsGoal, GoalContribution):
    admin.site.register(m)
