from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from stores.models import Store
from categories.models import Category


class Product(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name='products', null=True, blank=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    short_description = models.CharField(max_length=512, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='products/images/', null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    currency = models.CharField(max_length=10, default='USD')
    unit = models.CharField(max_length=50, default='Pc', blank=True)
    stock_quantity = models.IntegerField(default=100)
    digital_file = models.FileField(upload_to='products/files/private/', null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['store', 'slug'], name='unique_product_slug_per_store')]
        indexes = [models.Index(fields=['store', 'slug']), models.Index(fields=['is_published']), models.Index(fields=['category'])]

    def save(self, *args, **kwargs):
        if self.digital_file and not self.file_size:
            try:
                self.file_size = self.digital_file.size
            except Exception:
                self.file_size = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.store.slug})"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/images/')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Image for {self.product.name}"


class Coupon(models.Model):
    DISCOUNT_TYPES = (
        ('PERCENTAGE', 'Percentage OFF (%)'),
        ('FLAT', 'Flat Amount OFF (₹)'),
        ('BOGO', 'Buy 1 Get 1 Free (BOGO) 🎁'),
        ('FREE_DELIVERY', 'Free Delivery 🚚'),
    )
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='coupons')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='coupons')
    code = models.CharField(max_length=50)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='FLAT')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    usage_count = models.PositiveIntegerField(default=0)
    valid_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['store', 'code'], name='unique_coupon_code_per_store')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.store.slug})"

