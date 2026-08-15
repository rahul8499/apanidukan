from django.contrib import admin
from .models import DownloadToken
from django.utils import timezone


@admin.register(DownloadToken)
class DownloadTokenAdmin(admin.ModelAdmin):
    list_display = ('token', 'user', 'product_id', 'is_active', 'created_at', 'expires_at')
    search_fields = ('user__email', 'token')
    list_filter = ('is_active',)
    actions = ['revoke_tokens']

    def revoke_tokens(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"Revoked {updated} token(s)")
    revoke_tokens.short_description = 'Revoke selected download tokens'
