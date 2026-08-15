from django.contrib import admin
from .models import Store, StoreSettings, SearchQuery, ProductRequest


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
