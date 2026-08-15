from django.db import models
from django.utils import timezone
from stores.models import Store


class Category(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/images/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['store', 'slug'], name='unique_store_slug')
        ]
        indexes = [models.Index(fields=['store', 'slug'])]

    def __str__(self):
        return f"{self.name} ({self.store.slug})"
