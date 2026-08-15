from django.contrib import admin
from .models import Store, StoreSettings


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'owner', 'phone_number', 'status', 'is_published', 'created_at')
    search_fields = ('name', 'slug', 'owner__email')
    list_filter = ('status', 'is_published')


@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'store')
