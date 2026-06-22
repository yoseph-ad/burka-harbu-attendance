from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceRecordViewSet, ScanAttendanceView

router = DefaultRouter()
router.register(r'records', AttendanceRecordViewSet, basename='records')

urlpatterns = [
    path('scan/', ScanAttendanceView.as_view(), name='scan_attendance'),
    path('', include(router.urls)),
]
