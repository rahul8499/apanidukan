from django.db.models.signals import post_save
from django.dispatch import receiver

from categories.defaults import ensure_garment_default_categories
from .models import Store


@receiver(post_save, sender=Store)
def create_default_garment_categories(sender, instance, created, **kwargs):
    if created and instance.business_type == 'GARMENTS':
        ensure_garment_default_categories(instance)
