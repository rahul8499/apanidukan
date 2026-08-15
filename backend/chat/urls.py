from django.urls import path
from .views import (
    PublicStoreChatView,
    PublicSendChatMessageView,
    PublicProductRequestAutoReplyView,
    SellerListConversationsView,
    SellerConversationMessagesView
)

urlpatterns = [
    # Public customer endpoints
    path('public/stores/<slug:slug>/chat/', PublicStoreChatView.as_view(), name='public-store-chat'),
    path('public/stores/<slug:slug>/chat/messages/', PublicSendChatMessageView.as_view(), name='public-store-chat-message'),
    path('public/stores/<slug:slug>/chat/auto-reply/', PublicProductRequestAutoReplyView.as_view(), name='public-store-chat-auto-reply'),

    # Seller endpoints
    path('seller/stores/<int:store_id>/conversations/', SellerListConversationsView.as_view(), name='seller-list-conversations'),
    path('seller/stores/<int:store_id>/conversations/<int:conversation_id>/messages/', SellerConversationMessagesView.as_view(), name='seller-conversation-messages'),
]
