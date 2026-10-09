from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import uuid


def generate_order_number():
    return uuid.uuid4().hex[:12]


class Order(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_PAID = 'PAID'
    STATUS_FAILED = 'FAILED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_REFUNDED = 'REFUNDED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True, default=generate_order_number)
    idempotency_key = models.CharField(max_length=64, blank=True, null=True, unique=True, db_index=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=10, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['store', '-created_at']),
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Order {self.order_number} ({self.customer.email})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True)
    product_name_snapshot = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    selected_size = models.CharField(max_length=30, blank=True, default='')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)


class Payment(models.Model):
    STATUS_CREATED = 'CREATED'
    STATUS_SUCCESS = 'SUCCESS'
    STATUS_FAILED = 'FAILED'
    STATUS_REFUNDED = 'REFUNDED'

    STATUS_CHOICES = [
        (STATUS_CREATED, 'Created'),
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    provider = models.CharField(max_length=100)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_CREATED)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class ProductAccess(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accesses')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    granted_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)


class WhatsAppOrder(models.Model):
    """A customer cart saved before the buyer is sent to WhatsApp."""
    STATUS_NEW = 'NEW'
    STATUS_PACKED = 'PACKED'
    STATUS_READY_FOR_PICKUP = 'READY_FOR_PICKUP'
    STATUS_OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY'
    STATUS_CONFIRMED = 'CONFIRMED'
    STATUS_PAID = 'PAID'
    STATUS_DELIVERED = 'DELIVERED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_CHOICES = [
        (STATUS_NEW, 'Placed'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_PACKED, 'Packed'),
        (STATUS_READY_FOR_PICKUP, 'Ready for Pickup'),
        (STATUS_OUT_FOR_DELIVERY, 'Out for Delivery'),
        (STATUS_PAID, 'Paid'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    ORDER_TYPE_CHOICES = [
        ('HOME_DELIVERY', 'Home Delivery'),
        ('STORE_PICKUP', 'Store Pickup'),
    ]

    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='whatsapp_orders')
    reference = models.CharField(max_length=16, unique=True, default=generate_order_number, editable=False, db_index=True)
    idempotency_key = models.CharField(max_length=64, blank=True, null=True, unique=True, db_index=True)
    tracking_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, null=True, blank=True, db_index=True)
    order_type = models.CharField(max_length=30, choices=ORDER_TYPE_CHOICES, default='HOME_DELIVERY')
    customer_name = models.CharField(max_length=150, blank=True)
    customer_phone = models.CharField(max_length=40, blank=True, db_index=True)
    payment_type = models.CharField(max_length=20, blank=True)
    utr_number = models.CharField(max_length=64, blank=True, default='')
    payment_gateway_ref = models.CharField(max_length=128, blank=True, default='')
    payment_verified = models.BooleanField(default=False)
    payment_verified_at = models.DateTimeField(null=True, blank=True)
    delivery_address = models.TextField(blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_url = models.URLField(blank=True)
    coupon_code = models.CharField(max_length=50, blank=True, default='')
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    wallet_points_redeemed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    wallet_cashback_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    items = models.JSONField(default=list)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NEW, db_index=True)
    cancellation_reason = models.CharField(max_length=255, blank=True, default='')
    customer_note = models.TextField(blank=True, default='')
    expected_dispatch_at = models.DateTimeField(null=True, blank=True)
    delivery_agent_name = models.CharField(max_length=120, blank=True, default='')
    delivery_agent_phone = models.CharField(max_length=40, blank=True, default='')
    delivery_proof = models.ImageField(upload_to='orders/delivery-proof/%Y/%m/', null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['store', '-created_at']),
            models.Index(fields=['store', 'status']),
            models.Index(fields=['customer_phone', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'WA-{self.reference} ({self.store.name})'


class CustomerWallet(models.Model):
    """Store loyalty coins and cashback wallet per customer phone number per store."""
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='customer_wallets')
    customer_phone = models.CharField(max_length=40, db_index=True)
    customer_name = models.CharField(max_length=150, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_redeemed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('store', 'customer_phone')
        ordering = ['-updated_at']

    def __str__(self):
        return f'Wallet {self.customer_phone} ({self.store.name}): ₹{self.balance}'



class CheckoutPhoneVerification(models.Model):
    """Single-use proof that a customer controls the order phone number."""
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='checkout_phone_verifications')
    customer_phone = models.CharField(max_length=40, db_index=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at


class OrderIssueRequest(models.Model):
    TYPE_REFUND = 'REFUND'
    TYPE_RETURN = 'RETURN'
    TYPE_EXCHANGE = 'EXCHANGE'
    TYPE_CHOICES = [(TYPE_REFUND, 'Refund'), (TYPE_RETURN, 'Return'), (TYPE_EXCHANGE, 'Exchange')]

    STATUS_REQUESTED = 'REQUESTED'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'
    STATUS_PROCESSING = 'PROCESSING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_FAILED = 'FAILED'
    STATUS_CHOICES = [
        (STATUS_REQUESTED, 'Requested'), (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'), (STATUS_PROCESSING, 'Processing'),
        (STATUS_COMPLETED, 'Completed'), (STATUS_FAILED, 'Failed'),
    ]

    order = models.ForeignKey(WhatsAppOrder, on_delete=models.CASCADE, related_name='issue_requests')
    request_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_REQUESTED, db_index=True)
    product_id = models.PositiveBigIntegerField(null=True, blank=True)
    selected_size = models.CharField(max_length=30, blank=True, default='')
    requested_size = models.CharField(max_length=30, blank=True, default='')
    quantity = models.PositiveIntegerField(default=1)
    reason = models.TextField()
    customer_phone = models.CharField(max_length=40, db_index=True)
    seller_note = models.TextField(blank=True, default='')
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    provider_refund_id = models.CharField(max_length=150, blank=True, default='')
    completion_proof = models.ImageField(upload_to='orders/exchange-completion/%Y/%m/', null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class OrderIssueEvidence(models.Model):
    issue = models.ForeignKey(OrderIssueRequest, on_delete=models.CASCADE, related_name='evidence')
    image = models.ImageField(upload_to='orders/exchange-evidence/%Y/%m/')
    created_at = models.DateTimeField(default=timezone.now)


class OrderStatusEvent(models.Model):
    order = models.ForeignKey(WhatsAppOrder, on_delete=models.CASCADE, related_name='status_events')
    from_status = models.CharField(max_length=30, blank=True, default='')
    to_status = models.CharField(max_length=30)
    actor_type = models.CharField(max_length=20, default='SYSTEM')
    actor_id = models.CharField(max_length=100, blank=True, default='')
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(default=timezone.now, db_index=True)


class OrderDeliveryOTP(models.Model):
    order = models.OneToOneField(WhatsAppOrder, on_delete=models.CASCADE, related_name='delivery_otp')
    otp_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    send_count = models.PositiveSmallIntegerField(default=1)
    is_verified = models.BooleanField(default=False)
    last_sent_at = models.DateTimeField(default=timezone.now)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class OrderIssueCompletionOTP(models.Model):
    issue = models.OneToOneField(OrderIssueRequest, on_delete=models.CASCADE, related_name='completion_otp')
    otp_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    send_count = models.PositiveSmallIntegerField(default=1)
    is_verified = models.BooleanField(default=False)
    last_sent_at = models.DateTimeField(default=timezone.now)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class OutboundNotification(models.Model):
    CHANNEL_WHATSAPP = 'WHATSAPP'
    CHANNEL_SMS = 'SMS'
    STATUS_PENDING = 'PENDING'
    STATUS_SENT = 'SENT'
    STATUS_FAILED = 'FAILED'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_SENT, 'Sent'), (STATUS_FAILED, 'Failed')]

    order = models.ForeignKey(WhatsAppOrder, on_delete=models.CASCADE, related_name='outbound_notifications', null=True, blank=True)
    channel = models.CharField(max_length=20, default=CHANNEL_WHATSAPP)
    recipient = models.CharField(max_length=40, db_index=True)
    message = models.TextField()
    event_key = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_error = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['order', 'event_key', 'recipient'], name='unique_order_notification_event')]
