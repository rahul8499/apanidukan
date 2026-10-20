from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.admin.models import LogEntry
from .models import PhoneOTP, PlatformAnnouncement

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'phone_number', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'created_at')
    search_fields = ('email', 'phone_number', 'first_name', 'last_name')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'created_at')
    readonly_fields = ('created_at', 'updated_at', 'deletion_requested_at', 'deleted_at')


@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'phone_number', 'otp_code', 'is_verified', 'created_at', 'expires_at')
    search_fields = ('phone_number',)
    list_filter = ('is_verified', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(PlatformAnnouncement)
class PlatformAnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'level', 'message_snippet', 'is_active', 'created_at', 'updated_at')
    search_fields = ('message',)
    list_filter = ('level', 'is_active', 'created_at')

    @admin.display(description='Message')
    def message_snippet(self, obj):
        return (obj.message[:60] + '...') if obj.message and len(obj.message) > 60 else (obj.message or '')


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ('action_time', 'user', 'content_type', 'object_repr', 'action_flag')
    list_filter = ('action_flag', 'content_type')
    search_fields = ('object_repr', 'change_message')
    readonly_fields = ('action_time', 'user', 'content_type', 'object_id', 'object_repr', 'action_flag', 'change_message')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

