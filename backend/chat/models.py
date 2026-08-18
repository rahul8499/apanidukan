from django.db import models
from django.utils import timezone
import uuid


def generate_session_id():
    return uuid.uuid4().hex[:16]


class ChatConversation(models.Model):
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='conversations')
    session_id = models.CharField(max_length=64, db_index=True)
    customer_name = models.CharField(max_length=150, blank=True, default='Customer')
    customer_phone = models.CharField(max_length=40, blank=True)
    last_message = models.TextField(blank=True)
    last_message_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-last_message_at']
        unique_together = ('store', 'session_id')

    def __str__(self):
        return f"Chat-{self.id} ({self.store.name} - {self.customer_name})"


class ChatMessage(models.Model):
    SENDER_CUSTOMER = 'CUSTOMER'
    SENDER_SELLER = 'SELLER'
    SENDER_CHOICES = [(SENDER_CUSTOMER, 'Customer'), (SENDER_SELLER, 'Seller')]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=10, choices=SENDER_CHOICES, default=SENDER_CUSTOMER)
    sender_name = models.CharField(max_length=150, blank=True)
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender_type}] {self.text[:30]}"
