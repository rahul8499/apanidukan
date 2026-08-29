from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, CurrentUserView, PlatformDashboardView, 
    PasswordResetRequestView, PasswordResetConfirmView, LogoutView,
    SendOTPView, VerifyOTPView, OTPRegisterCompleteView, AccountDeletionRequestView, DeletedSellerAdminView, RestoreDeletedSellerView,
    AdminToggleStoreStatusView, AdminDeactivateStoreView, AdminStoreCustomersView,
    PublicPlatformAnnouncementView, AdminPlatformAnnouncementView, AdminExportStoresCSVView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
    path('platform/dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('platform/announcement/', PublicPlatformAnnouncementView.as_view(), name='platform-announcement-public'),
    path('admin/announcement/', AdminPlatformAnnouncementView.as_view(), name='admin-announcement'),
    path('admin/export-stores-csv/', AdminExportStoresCSVView.as_view(), name='admin-export-stores-csv'),
    path('admin/stores/<int:store_id>/toggle-status/', AdminToggleStoreStatusView.as_view(), name='admin-toggle-store-status'),
    path('admin/stores/<int:store_id>/deactivate/', AdminDeactivateStoreView.as_view(), name='admin-deactivate-store'),
    path('admin/stores/<int:store_id>/customers/', AdminStoreCustomersView.as_view(), name='admin-store-customers'),
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
