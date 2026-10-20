from django.contrib import admin
from .models import (
    Order, OrderItem, Payment, ProductAccess, WhatsAppOrder, OutboundNotification,
    CustomerWallet, CheckoutPhoneVerification, OrderIssueRequest, OrderIssueEvidence,
    OrderStatusEvent, OrderDeliveryOTP, OrderCancellationOTP, OrderIssueCompletionOTP,
    DeliveryAssignment
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    readonly_fields = ('product_name_snapshot', 'price_snapshot', 'quantity', 'subtotal')
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer', 'store', 'total', 'status', 'created_at')
    inlines = [OrderItemInline]
    search_fields = ('order_number', 'customer__email')
    list_filter = ('status', 'store')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product_name_snapshot', 'price_snapshot', 'quantity', 'selected_size', 'subtotal')
    search_fields = ('product_name_snapshot', 'order__order_number')
    list_filter = ('order__store',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'provider', 'transaction_id', 'amount', 'status', 'paid_at')
    search_fields = ('transaction_id', 'order__order_number')
    list_filter = ('status', 'provider')


@admin.register(ProductAccess)
class ProductAccessAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'order', 'granted_at', 'is_active')
    search_fields = ('customer__email', 'product__name', 'order__order_number')
    list_filter = ('is_active',)


class OrderStatusEventInline(admin.TabularInline):
    model = OrderStatusEvent
    extra = 0
    readonly_fields = ('from_status', 'to_status', 'actor_type', 'actor_id', 'note', 'created_at')


@admin.register(WhatsAppOrder)
class WhatsAppOrderAdmin(admin.ModelAdmin):
    list_display = ('reference', 'store', 'customer_name', 'customer_phone', 'order_type', 'total', 'status', 'payment_verified', 'created_at')
    list_filter = ('status', 'order_type', 'payment_verified', 'store')
    search_fields = ('reference', 'store__name', 'customer_name', 'customer_phone', 'utr_number')
    inlines = [OrderStatusEventInline]

    def get_readonly_fields(self, request, obj=None):
        # An accepted order is a financial record. Staff may update its
        # fulfillment status, but never its customer, items, prices or totals.
        if obj:
            return tuple(
                field.name for field in self.model._meta.fields
                if field.name not in {'status', 'updated_at', 'payment_verified', 'payment_verified_at'}
            ) + ('updated_at',)
        return ()


@admin.register(CustomerWallet)
class CustomerWalletAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_phone', 'customer_name', 'store', 'balance', 'total_earned', 'total_redeemed', 'updated_at')
    search_fields = ('customer_phone', 'customer_name', 'store__name')
    list_filter = ('store',)


@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'agent', 'status', 'assigned_by', 'assigned_at', 'accepted_at', 'completed_at')
    search_fields = ('order__reference', 'agent__full_name', 'agent__agent_code')
    list_filter = ('status', 'assigned_at')


class OrderIssueEvidenceInline(admin.TabularInline):
    model = OrderIssueEvidence
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(OrderIssueRequest)
class OrderIssueRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'request_type', 'status', 'customer_phone', 'refund_amount', 'created_at')
    search_fields = ('order__reference', 'customer_phone', 'reason')
    list_filter = ('request_type', 'status', 'created_at')
    inlines = [OrderIssueEvidenceInline]


@admin.register(OrderIssueEvidence)
class OrderIssueEvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'issue', 'image', 'created_at')
    search_fields = ('issue__order__reference', 'issue__customer_phone')


@admin.register(OrderStatusEvent)
class OrderStatusEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'from_status', 'to_status', 'actor_type', 'created_at')
    search_fields = ('order__reference', 'actor_id', 'note')
    list_filter = ('actor_type', 'to_status', 'created_at')


@admin.register(OrderDeliveryOTP)
class OrderDeliveryOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'is_verified', 'attempts', 'send_count', 'expires_at', 'created_at')
    search_fields = ('order__reference',)
    list_filter = ('is_verified', 'created_at')


@admin.register(OrderCancellationOTP)
class OrderCancellationOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'attempts', 'send_count', 'expires_at', 'created_at')
    search_fields = ('order__reference',)


@admin.register(OrderIssueCompletionOTP)
class OrderIssueCompletionOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'issue', 'is_verified', 'attempts', 'send_count', 'expires_at', 'created_at')
    search_fields = ('issue__order__reference',)
    list_filter = ('is_verified',)


@admin.register(CheckoutPhoneVerification)
class CheckoutPhoneVerificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'customer_phone', 'token', 'is_used', 'expires_at', 'created_at')
    search_fields = ('customer_phone', 'token', 'store__name')
    list_filter = ('is_used', 'store')


@admin.register(OutboundNotification)
class OutboundNotificationAdmin(admin.ModelAdmin):
    list_display = ('event_key', 'recipient', 'channel', 'status', 'attempts', 'next_attempt_at', 'sent_at')
    list_filter = ('status', 'channel')
    search_fields = ('recipient', 'event_key', 'order__reference')
    readonly_fields = ('order', 'recipient', 'message', 'event_key', 'attempts', 'last_error', 'sent_at', 'created_at', 'updated_at')
