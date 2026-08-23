from django.contrib import admin
from .models import Store, StoreSettings, StoreScratchConfig, SearchQuery, ProductRequest, StoreReport, SellerNotification, CustomerNotification


class StoreSettingsInline(admin.StackedInline):
    model = StoreSettings
    can_delete = False
    extra = 0


class StoreScratchConfigInline(admin.StackedInline):
    model = StoreScratchConfig
    can_delete = False
    extra = 0


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'get_owner', 'phone_number', 'status', 'is_published', 'visits_count', 'created_at')
    search_fields = ('name', 'slug', 'owner__email', 'phone_number')
    list_filter = ('status', 'is_published')
    inlines = [StoreSettingsInline, StoreScratchConfigInline]

    @admin.display(description='Owner')
    def get_owner(self, obj):
        try:
            return obj.owner.email if (obj and obj.owner) else "No Owner"
        except Exception:
            return "No Owner"


@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_store_name')

    @admin.display(description='Store')
    def get_store_name(self, obj):
        try:
            return obj.store.name if (obj and obj.store) else "No Store"
        except Exception:
            return "No Store"


@admin.register(SearchQuery)
class SearchQueryAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_store_name', 'query_term', 'search_count', 'last_searched_at')
    search_fields = ('query_term', 'store__name')
    list_filter = ('store',)

    @admin.display(description='Store')
    def get_store_name(self, obj):
        try:
            return obj.store.name if (obj and obj.store) else "No Store"
        except Exception:
            return "No Store"


@admin.register(ProductRequest)
class ProductRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_store_name', 'product_name', 'customer_name', 'customer_phone', 'created_at')
    search_fields = ('product_name', 'customer_name', 'customer_phone', 'store__name')
    list_filter = ('store',)

    @admin.display(description='Store')
    def get_store_name(self, obj):
        try:
            return obj.store.name if (obj and obj.store) else "No Store"
        except Exception:
            return "No Store"


@admin.register(StoreReport)
class StoreReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_store_name', 'reason', 'status', 'contact_phone', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('store__name', 'store__slug', 'details', 'contact_phone')
    readonly_fields = ('store', 'reason', 'details', 'contact_phone', 'created_at', 'updated_at')
    actions = ('mark_reviewing', 'mark_resolved', 'mark_dismissed')

    @admin.display(description='Store')
    def get_store_name(self, obj):
        try:
            return obj.store.name if (obj and obj.store) else "No Store"
        except Exception:
            return "No Store"

    @admin.action(description='Mark selected reports as reviewing')
    def mark_reviewing(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_REVIEWING)

    @admin.action(description='Mark selected reports as resolved')
    def mark_resolved(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_RESOLVED)

    @admin.action(description='Dismiss selected reports')
    def mark_dismissed(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_DISMISSED)

