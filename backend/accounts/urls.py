from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView,
    UserProfileView,
    TeacherViewSet,
    TeacherAssignmentViewSet
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'teachers', TeacherViewSet, basename='teachers')
router.register(r'assignments', TeacherAssignmentViewSet, basename='assignments')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_direct'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('', include(router.urls)),
]
