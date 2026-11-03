from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from finance.views import AnalyticsEndpointView, DashboardSummaryView


def api_root(request):
    return JsonResponse({
        "name": "BudgetBuddy API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "auth": "/api/auth/",
            "finance": "/api/finance/",
            "dashboard": "/api/dashboard/summary/",
            "notifications": "/api/notifications/",
            "reports": "/api/reports/",
            "admin": "/admin/",
        },
    })


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/analytics/<str:report>/", AnalyticsEndpointView.as_view(), name="analytics-root"),
    path("api/dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("api/notifications/", include("notifications.urls")),
    path("api/reports/", include("reports.urls")),
]
