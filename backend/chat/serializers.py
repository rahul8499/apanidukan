from rest_framework import serializers
from .models import ChatConversation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'conversation', 'sender_type', 'sender_name', 'text', 'is_read', 'created_at')
        read_only_fields = ('id', 'conversation', 'created_at')


class ChatConversationSerializer(serializers.ModelSerializer):
    unread_count = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    store_phone = serializers.SerializerMethodField()
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatConversation
        fields = ('id', 'store', 'session_id', 'customer_name', 'customer_phone', 'store_name', 'store_phone', 'last_message', 'last_message_at', 'unread_count', 'messages', 'created_at')
        read_only_fields = ('id', 'store', 'created_at')

    def get_unread_count(self, obj):
        return obj.messages.filter(sender_type='CUSTOMER', is_read=False).count()

    def get_store_name(self, obj):
        return obj.store.name if obj.store else ''

    def get_store_phone(self, obj):
        return obj.store.phone_number if obj.store else ''
