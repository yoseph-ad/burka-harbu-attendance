from django.urls import path
from .views import DashboardStatsView, DownloadExcelView, DownloadPDFView

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('download/excel/', DownloadExcelView.as_view(), name='download_excel'),
    path('download/pdf/', DownloadPDFView.as_view(), name='download_pdf'),
]
