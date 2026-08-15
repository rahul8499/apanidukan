from django.contrib import admin
from .models import Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store', 'category', 'price', 'currency', 'is_published')
    search_fields = ('name', 'slug', 'store__name')
    list_filter = ('is_published', 'currency')
    inlines = [ProductImageInline]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'image', 'created_at')
