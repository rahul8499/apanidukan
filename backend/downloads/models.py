from django.db import models
from django.utils import timezone
import uuid
from django.conf import settings


class DownloadToken(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='download_tokens')
    product_id = models.IntegerField()  # product id snapshot to avoid FK complexity before orders implemented
    file_path = models.CharField(max_length=1024)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    def __str__(self):
        return str(self.token)
