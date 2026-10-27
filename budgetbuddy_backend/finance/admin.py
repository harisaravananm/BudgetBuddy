from django.contrib import admin
from .models import Budget, Expense, Income, SavingsGoal

for m in (Income, Expense, Budget, SavingsGoal):
    admin.site.register(m)
