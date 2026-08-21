from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone


from decimal import Decimal

def unique_slugify(model, value, slug_field_name='slug'):
    base_slug = slugify(value)[:50]
    slug = base_slug
    i = 2
    while model.objects.filter(**{slug_field_name: slug}).exists():
        slug = f"{base_slug}-{i}"
        i += 1
    return slug


class Store(models.Model):
    STATUS_DRAFT = 'DRAFT'
    STATUS_PUBLISHED = 'PUBLISHED'
    STATUS_ARCHIVED = 'ARCHIVED'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    DELIVERY_TYPE_CHOICES = [
        ('FREE', 'Free Delivery'),
        ('FIXED', 'Flat Delivery Fee'),
        ('PER_KM', 'Per KM Delivery Fee'),
        ('HYBRID', 'Base Fee + Per KM'),
    ]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stores')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=40, blank=True, null=True)
    logo = models.ImageField(upload_to='stores/logos/', null=True, blank=True)
    theme = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    is_published = models.BooleanField(default=False)
    manage_in_app = models.BooleanField(default=False)
    allow_home_delivery = models.BooleanField(default=True)
    allow_store_pickup = models.BooleanField(default=True)
    
    # Fulfillment & Delivery Configuration
    min_delivery_order = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_radius_km = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('10.00'))
    delivery_charge_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES, default='FIXED')
    delivery_flat_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_per_km_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    free_delivery_above = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_estimated_time = models.CharField(max_length=100, default='30-45 mins', blank=True)
    pickup_instructions = models.TextField(blank=True, default='')

    # Dynamic Customer Loyalty & Cashback Wallet Configuration
    enable_loyalty_cashback = models.BooleanField(default=True)
    loyalty_cashback_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('5.00'))
    loyalty_min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Custom Domain Mapping Configuration
    custom_domain = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    custom_domain_verified = models.BooleanField(default=False)

    visits_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['slug'])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(Store, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.owner})"


class StoreSettings(models.Model):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='settings')
    primary_color = models.CharField(max_length=20, default='#000000')
    secondary_color = models.CharField(max_length=20, default='#ffffff')
    background_color = models.CharField(max_length=20, default='#ffffff')
    text_color = models.CharField(max_length=20, default='#000000')
    button_style = models.CharField(max_length=100, blank=True)
    font_family = models.CharField(max_length=100, blank=True)
    banner_image = models.ImageField(upload_to='stores/banners/', null=True, blank=True)
    favicon = models.ImageField(upload_to='stores/favicons/', null=True, blank=True)
    soundbox_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.store.name}"


class StoreScratchConfig(models.Model):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='scratch_config')
    enabled = models.BooleanField(default=True)
    title = models.CharField(max_length=150, default="🎉 Scratch & Win Welcome Gift!")
    reward_text = models.CharField(max_length=200, default="Flat ₹5 OFF on orders above ₹10")
    coupon_code = models.CharField(max_length=50, default="LUCKY50")
    discount_type = models.CharField(max_length=20, choices=[('fixed', 'Fixed'), ('percentage', 'Percentage')], default='fixed')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('5.00'))
    min_order = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('10.00'))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Scratch Config for {self.store.name}"


class SellerNotification(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50) # e.g., 'order', 'system', 'chat'
    title = models.CharField(max_length=200)
    body = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} - {self.store.name}"


class CustomerNotification(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='customer_notifications')
    customer_id = models.CharField(max_length=150, db_index=True)
    notification_type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    body = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} - {self.customer_id}"


class SearchQuery(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='search_queries')
    query_term = models.CharField(max_length=255)
    search_count = models.PositiveIntegerField(default=1)
    last_searched_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('store', 'query_term')
        ordering = ['-search_count', '-last_searched_at']

    def __str__(self):
        return f"'{self.query_term}' ({self.search_count}) - {self.store.name}"


class ProductRequest(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='product_requests')
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=40)
    product_name = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request for '{self.product_name}' by {self.customer_name}"


class StoreReport(models.Model):
    STATUS_OPEN = 'OPEN'
    STATUS_REVIEWING = 'REVIEWING'
    STATUS_RESOLVED = 'RESOLVED'
    STATUS_DISMISSED = 'DISMISSED'
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_REVIEWING, 'Reviewing'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_DISMISSED, 'Dismissed'),
    ]

    REASON_CHOICES = [
        ('FRAUD', 'Fraud or scam concern'),
        ('PRODUCT', 'Product or service issue'),
        ('PAYMENT', 'Payment issue'),
        ('ABUSE', 'Abusive or inappropriate content'),
        ('OTHER', 'Other'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    details = models.TextField(max_length=1500)
    contact_phone = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report #{self.id} for {self.store.name}: {self.reason}'
