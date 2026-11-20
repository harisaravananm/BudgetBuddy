import csv
import io
from datetime import date, datetime
from decimal import Decimal
from django.db.models import Sum
from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import Budget, Category, Expense, Income, SavingsGoal
from .models import Report
from .serializers import ReportSerializer


class MonthlySummaryReportView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        month_param = request.query_params.get("month")
        if month_param:
            try:
                dt = datetime.strptime(month_param, "%Y-%m").date()
            except ValueError:
                dt = date.today().replace(day=1)
        else:
            dt = date.today().replace(day=1)

        year, month = dt.year, dt.month
        month_label = dt.strftime("%B %Y")

        incomes = Income.objects.filter(user=user, date__year=year, date__month=month)
        expenses = Expense.objects.filter(user=user, date__year=year, date__month=month)
        budgets = Budget.objects.filter(user=user, month__year=year, month__month=month)
        goals = SavingsGoal.objects.filter(user=user)

        total_income = incomes.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_expense = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        net_savings = total_income - total_expense

        # Income by source
        income_breakdown = []
        for src, label in Income.Source.choices:
            sub = incomes.filter(source=src).aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
            if sub > 0:
                income_breakdown.append({
                    "source": src,
                    "label": label,
                    "amount": float(sub),
                    "percentage": round(float(sub) / float(total_income) * 100, 1) if total_income > 0 else 0,
                })

        # Expense by category
        expense_breakdown = []
        for cat, label in Category.choices:
            sub = expenses.filter(category=cat).aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
            if sub > 0:
                expense_breakdown.append({
                    "category": cat,
                    "label": label,
                    "amount": float(sub),
                    "percentage": round(float(sub) / float(total_expense) * 100, 1) if total_expense > 0 else 0,
                })

        # Budget analysis
        budget_summary = []
        for b in budgets:
            cat_display = dict(Category.choices).get(b.category, "Overall Monthly Limit")
            spent = (
                expenses.filter(category=b.category).aggregate(t=Sum("amount"))["t"]
                if b.category
                else total_expense
            ) or Decimal("0.00")
            pct = round(float(spent) / float(b.limit_amount) * 100, 1) if b.limit_amount > 0 else 0
            budget_summary.append({
                "category": b.category or "overall",
                "label": cat_display,
                "limit": float(b.limit_amount),
                "spent": float(spent),
                "remaining": float(max(Decimal("0.00"), b.limit_amount - spent)),
                "percentage_used": pct,
                "over_budget": spent > b.limit_amount,
            })

        goals_summary = [
            {
                "id": g.id,
                "name": g.name,
                "target": float(g.target_amount),
                "saved": float(g.saved_amount),
                "progress_percent": g.progress_percent,
                "status": g.status,
            }
            for g in goals
        ]

        return Response({
            "month": dt.strftime("%Y-%m"),
            "month_label": month_label,
            "user_email": user.email,
            "currency": getattr(user.profile, "currency", "INR"),
            "total_income": float(total_income),
            "total_expense": float(total_expense),
            "net_savings": float(net_savings),
            "savings_rate": round(float(net_savings) / float(total_income) * 100, 1) if total_income > 0 else 0,
            "income_breakdown": income_breakdown,
            "expense_breakdown": expense_breakdown,
            "budget_summary": budget_summary,
            "goals_summary": goals_summary,
        })


class ExportCsvReportView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        month_param = request.query_params.get("month")
        if month_param:
            try:
                dt = datetime.strptime(month_param, "%Y-%m").date()
            except ValueError:
                dt = date.today().replace(day=1)
        else:
            dt = date.today().replace(day=1)

        year, month = dt.year, dt.month
        incomes = Income.objects.filter(user=user, date__year=year, date__month=month)
        expenses = Expense.objects.filter(user=user, date__year=year, date__month=month)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Type", "Date", "Category/Source", "Amount (INR)", "Note"])

        for inc in incomes:
            writer.writerow(["Income", inc.date.isoformat(), inc.get_source_display(), f"{inc.amount:.2f}", inc.note])

        for exp in expenses:
            writer.writerow(["Expense", exp.date.isoformat(), exp.get_category_display(), f"{exp.amount:.2f}", exp.note])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        filename = f"budgetbuddy_report_{dt.strftime('%Y_%m')}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ExportExcelReportView(APIView):
    """Generates a tab-separated Excel-compatible CSV file."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        month_param = request.query_params.get("month")
        if month_param:
            try:
                dt = datetime.strptime(month_param, "%Y-%m").date()
            except ValueError:
                dt = date.today().replace(day=1)
        else:
            dt = date.today().replace(day=1)

        year, month = dt.year, dt.month
        incomes = Income.objects.filter(user=user, date__year=year, date__month=month)
        expenses = Expense.objects.filter(user=user, date__year=year, date__month=month)
        total_income = incomes.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        total_expense = expenses.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        net = total_income - total_expense

        output = io.StringIO()
        writer = csv.writer(output, dialect="excel-tab")
        writer.writerow(["BudgetBuddy Financial Report", dt.strftime("%B %Y")])
        writer.writerow(["User", user.email])
        writer.writerow([])
        writer.writerow(["FINANCIAL SUMMARY"])
        writer.writerow(["Total Income", f"{total_income:.2f}"])
        writer.writerow(["Total Expenses", f"{total_expense:.2f}"])
        writer.writerow(["Net Savings", f"{net:.2f}"])
        writer.writerow([])
        writer.writerow(["TRANSACTIONS BREAKDOWN"])
        writer.writerow(["Type", "Date", "Category / Source", "Amount", "Note"])

        for inc in incomes:
            writer.writerow(["Income", inc.date.isoformat(), inc.get_source_display(), f"{inc.amount:.2f}", inc.note])
        for exp in expenses:
            writer.writerow(["Expense", exp.date.isoformat(), exp.get_category_display(), f"{exp.amount:.2f}", exp.note])

        response = HttpResponse(output.getvalue(), content_type="application/vnd.ms-excel")
        filename = f"budgetbuddy_statement_{dt.strftime('%Y_%m')}.xls"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ExportPdfHtmlReportView(APIView):
    """Provides a styled, printable HTML statement ready for browser Ctrl+P or save-as-PDF."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        month_param = request.query_params.get("month")
        if month_param:
            try:
                dt = datetime.strptime(month_param, "%Y-%m").date()
            except ValueError:
                dt = date.today().replace(day=1)
        else:
            dt = date.today().replace(day=1)

        year, month = dt.year, dt.month
        incomes = Income.objects.filter(user=user, date__year=year, date__month=month)
        expenses = Expense.objects.filter(user=user, date__year=year, date__month=month)
        total_income = incomes.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        total_expense = expenses.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        net = total_income - total_expense
        savings_rate = (float(net) / float(total_income) * 100) if total_income > 0 else 0

        income_rows = "".join(
            f"<tr><td>{i.date}</td><td>Income</td><td>{i.get_source_display()}</td><td>{i.note or '-'}</td><td class='pos'>+₹{i.amount:.2f}</td></tr>"
            for i in incomes
        ) or "<tr><td colspan='5' style='text-align:center;'>No income records</td></tr>"

        expense_rows = "".join(
            f"<tr><td>{e.date}</td><td>Expense</td><td>{e.get_category_display()}</td><td>{e.note or '-'}</td><td class='neg'>-₹{e.amount:.2f}</td></tr>"
            for e in expenses
        ) or "<tr><td colspan='5' style='text-align:center;'>No expense records</td></tr>"

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BudgetBuddy Financial Report - {dt.strftime('%B %Y')}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }}
        .brand {{ font-size: 24px; font-weight: 800; color: #4f46e5; }}
        .meta {{ text-align: right; font-size: 14px; color: #64748b; }}
        .summary-cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }}
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }}
        .card-label {{ font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; }}
        .card-val {{ font-size: 22px; font-weight: 700; margin-top: 6px; }}
        .pos {{ color: #10b981; font-weight: 600; }}
        .neg {{ color: #ef4444; font-weight: 600; }}
        h2 {{ font-size: 18px; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f1f5f9; font-weight: 600; color: #475569; }}
        .footer {{ margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
        @media print {{
            body {{ margin: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="background:#4f46e5;color:white;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Print / Save as PDF</button>
    </div>
    <div class="header">
        <div>
            <div class="brand">BudgetBuddy</div>
            <div style="font-size:14px;color:#64748b;">Monthly Financial Statement & Analytics</div>
        </div>
        <div class="meta">
            <div><strong>Report Period:</strong> {dt.strftime('%B %Y')}</div>
            <div><strong>Account:</strong> {user.email}</div>
            <div><strong>Generated:</strong> {date.today().strftime('%b %d, %Y')}</div>
        </div>
    </div>

    <div class="summary-cards">
        <div class="card">
            <div class="card-label">Total Income</div>
            <div class="card-val pos">₹{total_income:.2f}</div>
        </div>
        <div class="card">
            <div class="card-label">Total Expenses</div>
            <div class="card-val neg">₹{total_expense:.2f}</div>
        </div>
        <div class="card">
            <div class="card-label">Net Savings</div>
            <div class="card-val" style="color:{'#10b981' if net >= 0 else '#ef4444'}">₹{net:.2f}</div>
        </div>
        <div class="card">
            <div class="card-label">Savings Rate</div>
            <div class="card-val">{savings_rate:.1f}%</div>
        </div>
    </div>

    <h2>Incomes Breakdown</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Type</th><th>Source</th><th>Note</th><th>Amount</th></tr>
        </thead>
        <tbody>
            {income_rows}
        </tbody>
    </table>

    <h2>Expenses Breakdown</h2>
    <table>
        <thead>
            <tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th>Amount</th></tr>
        </thead>
        <tbody>
            {expense_rows}
        </tbody>
    </table>

    <div class="footer">
        Generated by BudgetBuddy Financial Platform • Cultivating discipline & smart money habits for students.
    </div>
</body>
</html>"""
        return HttpResponse(html_content, content_type="text/html")


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Report.objects.filter(user=self.request.user)
