from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_root(request):
    return JsonResponse({
        "name": "BudgetBuddy API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "auth": "/api/auth/",
            "finance": "/api/finance/",
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
    path("api/notifications/", include("notifications.urls")),
    path("api/reports/", include("reports.urls")),
]
