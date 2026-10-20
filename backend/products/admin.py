from django.contrib import admin
from .models import Product, ProductImage, ProductVariant, Coupon


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store', 'category', 'price', 'currency', 'stock_quantity', 'is_published', 'created_at')
    search_fields = ('name', 'slug', 'store__name')
    list_filter = ('is_published', 'currency', 'store')
    inlines = [ProductImageInline, ProductVariantInline]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'image', 'created_at')
    search_fields = ('product__name',)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'size', 'color', 'sku', 'stock_quantity', 'price_override', 'is_active')
    search_fields = ('sku', 'product__name', 'size', 'color')
    list_filter = ('is_active', 'size', 'color')


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'store', 'product', 'discount_type', 'discount_value', 'min_order_amount', 'is_active', 'usage_count', 'valid_until', 'created_at')
    search_fields = ('code', 'store__name', 'product__name')
    list_filter = ('discount_type', 'is_active', 'store')

