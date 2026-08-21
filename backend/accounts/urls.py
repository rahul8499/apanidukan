from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, CurrentUserView, PlatformDashboardView, 
    PasswordResetRequestView, PasswordResetConfirmView, LogoutView,
    SendOTPView, VerifyOTPView, OTPRegisterCompleteView, AccountDeletionRequestView, DeletedSellerAdminView, RestoreDeletedSellerView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
    path('platform/dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('account/deactivate/', AccountDeletionRequestView.as_view(), name='account-deactivate'),
    path('admin/deleted-sellers/', DeletedSellerAdminView.as_view(), name='deleted-sellers'),
    path('admin/deleted-sellers/<int:user_id>/restore/', RestoreDeletedSellerView.as_view(), name='restore-deleted-seller'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/<uid>/<token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # MSG91 Mobile OTP Auth Routes
    path('otp/send/', SendOTPView.as_view(), name='auth-otp-send'),
    path('otp/verify/', VerifyOTPView.as_view(), name='auth-otp-verify'),
    path('otp/register-complete/', OTPRegisterCompleteView.as_view(), name='auth-otp-register-complete'),
]
