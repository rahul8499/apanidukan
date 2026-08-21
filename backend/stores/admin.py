from django.contrib import admin
from .models import Store, StoreSettings, SearchQuery, ProductRequest, StoreReport


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'owner', 'phone_number', 'status', 'is_published', 'visits_count', 'created_at')
    search_fields = ('name', 'slug', 'owner__email', 'phone_number')
    list_filter = ('status', 'is_published')


@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'store')


@admin.register(SearchQuery)
class SearchQueryAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'query_term', 'search_count', 'last_searched_at')
    search_fields = ('query_term', 'store__name')
    list_filter = ('store',)


@admin.register(ProductRequest)
class ProductRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'product_name', 'customer_name', 'customer_phone', 'created_at')
    search_fields = ('product_name', 'customer_name', 'customer_phone', 'store__name')
    list_filter = ('store',)


@admin.register(StoreReport)
class StoreReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'reason', 'status', 'contact_phone', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('store__name', 'store__slug', 'details', 'contact_phone')
    readonly_fields = ('store', 'reason', 'details', 'contact_phone', 'created_at', 'updated_at')
    actions = ('mark_reviewing', 'mark_resolved', 'mark_dismissed')

    @admin.action(description='Mark selected reports as reviewing')
    def mark_reviewing(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_REVIEWING)

    @admin.action(description='Mark selected reports as resolved')
    def mark_resolved(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_RESOLVED)

    @admin.action(description='Dismiss selected reports')
    def mark_dismissed(self, request, queryset):
        queryset.update(status=StoreReport.STATUS_DISMISSED)
