from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store', 'category', 'price', 'currency', 'is_published')
    search_fields = ('name', 'slug', 'store__name')
    list_filter = ('is_published', 'currency')
