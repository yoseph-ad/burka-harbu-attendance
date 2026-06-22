from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GradeViewSet, SectionViewSet, StudentViewSet

router = DefaultRouter()
router.register(r'grades', GradeViewSet, basename='grades')
router.register(r'sections', SectionViewSet, basename='sections')
router.register(r'students', StudentViewSet, basename='students')

urlpatterns = [
    path('', include(router.urls)),
]
