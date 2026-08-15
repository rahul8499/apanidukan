from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone


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

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stores')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    phone_number = models.CharField(max_length=40, blank=True, null=True)
    logo = models.ImageField(upload_to='stores/logos/', null=True, blank=True)
    theme = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    is_published = models.BooleanField(default=False)
    manage_in_app = models.BooleanField(default=False)
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
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.store.name}"


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
