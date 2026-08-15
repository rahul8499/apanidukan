from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, CurrentUserView, PlatformDashboardView, PasswordResetRequestView, PasswordResetConfirmView, LogoutView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
    path('platform/dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/<uid>/<token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
