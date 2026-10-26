from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ExportCsvReportView,
    ExportExcelReportView,
    ExportPdfHtmlReportView,
    MonthlySummaryReportView,
    ReportViewSet,
)

router = DefaultRouter()
router.register("history", ReportViewSet, basename="report")

urlpatterns = [
    path("", include(router.urls)),
    path("summary/", MonthlySummaryReportView.as_view(), name="report-summary"),
    path("export-csv/", ExportCsvReportView.as_view(), name="report-export-csv"),
    path("export-excel/", ExportExcelReportView.as_view(), name="report-export-excel"),
    path("export-pdf/", ExportPdfHtmlReportView.as_view(), name="report-export-pdf"),
]
