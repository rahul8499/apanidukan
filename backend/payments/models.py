from django.db import models
from django.conf import settings
from django.utils import timezone
from stores.models import Store
import os


class SubscriptionPlan(models.Model):
    PLAN_BASIC = 'BASIC'
    PLAN_PREMIUM = 'PREMIUM'

    PLAN_CHOICES = [
        (PLAN_BASIC, 'Basic Plan'),
        (PLAN_PREMIUM, 'Premium Plan'),
    ]

    name = models.CharField(max_length=50, choices=PLAN_CHOICES, unique=True)
    plan_id = models.CharField(max_length=100, unique=True, help_text="Razorpay Plan ID (e.g. plan_TBsfoswSWV4H7Q)")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='INR')
    period = models.CharField(max_length=50, default='Every Month')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.plan_id}) - ₹{self.amount}"


class StoreSubscription(models.Model):
    PLAN_BASIC = 'BASIC'
    PLAN_PREMIUM = 'PREMIUM'

    PLAN_CHOICES = [
        (PLAN_BASIC, 'Basic Plan'),
        (PLAN_PREMIUM, 'Premium Plan'),
    ]

    STATUS_CREATED = 'created'
    STATUS_AUTHENTICATED = 'authenticated'
    STATUS_ACTIVE = 'active'
    STATUS_PENDING = 'pending'
    STATUS_HALTED = 'halted'
    STATUS_CANCELLED = 'cancelled'
    STATUS_COMPLETED = 'completed'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_CREATED, 'Created'),
        (STATUS_AUTHENTICATED, 'Authenticated'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PENDING, 'Pending'),
        (STATUS_HALTED, 'Halted'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='subscription')
    plan_name = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_PREMIUM)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='subscriptions')
    razorpay_plan_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_subscription_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_customer_id = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    short_url = models.URLField(blank=True, null=True, max_length=500)

    current_start = models.DateTimeField(blank=True, null=True)
    current_end = models.DateTimeField(blank=True, null=True)
    charge_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)

    total_count = models.IntegerField(default=12)
    paid_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.store.name} - {self.plan_name} ({self.status})"


class SubscriptionPaymentHistory(models.Model):
    subscription = models.ForeignKey(StoreSubscription, on_delete=models.CASCADE, related_name='payments')
    razorpay_payment_id = models.CharField(max_length=100, unique=True)
    razorpay_invoice_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=30, default='captured')
    payment_method = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.razorpay_payment_id} - ₹{self.amount} ({self.status})"
