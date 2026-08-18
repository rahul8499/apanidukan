from django.contrib import admin
from .models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('sender_type', 'sender_name', 'text', 'created_at')


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'session_id', 'customer_name', 'customer_phone', 'last_message_at')
    search_fields = ('session_id', 'customer_name', 'customer_phone', 'store__name')
    list_filter = ('store',)
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender_type', 'sender_name', 'text_snippet', 'is_read', 'created_at')
    search_fields = ('text', 'sender_name', 'conversation__session_id')
    list_filter = ('sender_type', 'is_read')

    def text_snippet(self, obj):
        return obj.text[:50]
    text_snippet.short_description = 'Message Snippet'
