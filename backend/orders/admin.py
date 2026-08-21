from django.contrib import admin
from .models import Order, OrderItem, Payment, ProductAccess, WhatsAppOrder


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    readonly_fields = ('product_name_snapshot', 'price_snapshot', 'quantity', 'subtotal')
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer', 'store', 'total', 'status', 'created_at')
    inlines = [OrderItemInline]
    search_fields = ('order_number', 'customer__email')
    list_filter = ('status',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'provider', 'transaction_id', 'amount', 'status', 'paid_at')
    search_fields = ('transaction_id',)


@admin.register(ProductAccess)
class ProductAccessAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'order', 'granted_at', 'is_active')
    search_fields = ('customer__email', 'product__name')


@admin.register(WhatsAppOrder)
class WhatsAppOrderAdmin(admin.ModelAdmin):
    list_display = ('reference', 'store', 'customer_name', 'customer_phone', 'total', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('reference', 'store__name', 'customer_name', 'customer_phone')

    def get_readonly_fields(self, request, obj=None):
        # An accepted order is a financial record. Staff may update its
        # fulfillment status, but never its customer, items, prices or totals.
        if obj:
            return tuple(
                field.name for field in self.model._meta.fields
                if field.name not in {'status', 'updated_at'}
            ) + ('updated_at',)
        return ()
