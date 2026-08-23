from django.contrib import admin
from django.utils.html import format_html
from .models import SubscriptionPlan, StoreSubscription, SubscriptionPaymentHistory


class SubscriptionPaymentHistoryInline(admin.TabularInline):
    model = SubscriptionPaymentHistory
    extra = 0
    readonly_fields = ('razorpay_payment_id', 'razorpay_invoice_id', 'razorpay_order_id', 'amount', 'currency', 'status', 'payment_method', 'created_at')
    can_delete = False
    ordering = ('-created_at',)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'plan_id', 'formatted_amount', 'currency', 'period', 'is_active', 'created_at')
    search_fields = ('name', 'plan_id')
    list_filter = ('is_active', 'name')

    def formatted_amount(self, obj):
        return f"₹{obj.amount:.2f}"
    formatted_amount.short_description = 'Price Amount'


@admin.register(StoreSubscription)
class StoreSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'store',
        'plan_name',
        'get_plan_amount',
        'status_badge',
        'current_start',
        'current_end',
        'paid_count',
        'razorpay_subscription_id',
    )
    search_fields = ('store__name', 'store__owner__email', 'razorpay_subscription_id', 'razorpay_customer_id')
    list_filter = ('plan_name', 'status')
    inlines = [SubscriptionPaymentHistoryInline]
    readonly_fields = ('razorpay_subscription_id', 'created_at', 'updated_at')

    def get_plan_amount(self, obj):
        if obj.plan:
            return f"₹{obj.plan.amount:.2f}"
        return "₹2,000.00" if obj.plan_name == 'PREMIUM' else "₹0.00"
    get_plan_amount.short_description = 'Monthly Amount'

    def status_badge(self, obj):
        color_map = {
            'active': 'green',
            'created': 'blue',
            'authenticated': 'purple',
            'pending': 'orange',
            'halted': 'red',
            'cancelled': 'gray',
            'expired': 'darkred',
        }
        color = color_map.get(obj.status.lower(), 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold; text-transform: uppercase;">{}</span>',
            color,
            obj.status,
        )
    status_badge.short_description = 'Status'


@admin.register(SubscriptionPaymentHistory)
class SubscriptionPaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'subscription_store', 'razorpay_payment_id', 'formatted_amount', 'currency', 'status', 'created_at')
    search_fields = ('razorpay_payment_id', 'razorpay_subscription_id', 'subscription__store__name')
    list_filter = ('status', 'currency')

    @admin.display(description='Store Name')
    def subscription_store(self, obj):
        try:
            return obj.subscription.store.name if (obj and obj.subscription and obj.subscription.store) else "Unknown Store"
        except Exception:
            return "Unknown Store"

    @admin.display(description='Amount')
    def formatted_amount(self, obj):
        return f"₹{obj.amount:.2f}"
