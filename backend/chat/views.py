from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core import signing
from stores.models import Store
from .models import ChatConversation, ChatMessage, generate_session_id
from .serializers import ChatConversationSerializer, ChatMessageSerializer
from config.websocket import broadcast_order_event_sync


CUSTOMER_CHAT_TOKEN_SALT = 'customer-chat-access'
CUSTOMER_CHAT_TOKEN_MAX_AGE = 60 * 60 * 24 * 90


def issue_customer_chat_token(store_id, session_id):
    return signing.dumps({
        'session_id': session_id,
        'store_id': store_id,
    }, salt=CUSTOMER_CHAT_TOKEN_SALT)


def resolve_customer_chat_token(store, token):
    if not isinstance(token, str) or not token:
        return None
    try:
        payload = signing.loads(token, salt=CUSTOMER_CHAT_TOKEN_SALT, max_age=CUSTOMER_CHAT_TOKEN_MAX_AGE)
        if int(payload.get('store_id')) != store.id:
            return None
        session_id = str(payload.get('session_id') or '')
        if len(session_id) != 32:
            return None
        conversation = store.conversations.filter(session_id=session_id).first()
        return {'session_id': session_id, 'conversation': conversation}
    except (signing.BadSignature, signing.SignatureExpired, AttributeError, TypeError, ValueError):
        return None


def customer_chat_response(store, conversation, token):
    if conversation:
        data = ChatConversationSerializer(conversation).data
        # Never expose the database's internal chat session identifier to customers.
        data.pop('session_id', None)
    else:
        data = {
            'id': None,
            'store': store.id,
            'store_name': store.name,
            'store_phone': store.phone_number,
            'messages': [],
        }
    data['chat_token'] = token
    return data


class PublicStoreChatView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_chat'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        cust_phone = str(request.data.get('customer_phone') or '').strip()[:40]
        cust_name = str(request.data.get('customer_name') or '').strip()[:150]
        token = request.data.get('chat_token', '')
        chat_session = resolve_customer_chat_token(store, token) if token else None
        if token and not chat_session:
            return Response({'detail': 'Chat session expired. Start a new chat to continue.'}, status=status.HTTP_401_UNAUTHORIZED)
        session_id = chat_session['session_id'] if chat_session else generate_session_id()
        conversation = chat_session['conversation'] if chat_session else None
        active_token = token or issue_customer_chat_token(store.id, session_id)

        if cust_name and cust_name.lower() != 'customer' and not cust_name.startswith('Guest Buyer'):
            effective_name = cust_name[:150]
        elif cust_phone:
            effective_name = f"Customer ({cust_phone})"[:150]
        else:
            effective_name = 'Customer'

        if conversation:
            if cust_name and cust_name.lower() != 'customer' and not cust_name.startswith('Guest Buyer'):
                conversation.customer_name = cust_name[:150]
            if cust_phone:
                conversation.customer_name = effective_name
                conversation.customer_phone = cust_phone[:40]
            conversation.save(update_fields=['customer_name', 'customer_phone'])

        return Response(customer_chat_response(store, conversation, active_token), status=status.HTTP_200_OK)


class PublicSendChatMessageView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_chat'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        token = request.data.get('chat_token', '')
        text = str(request.data.get('text', '')).strip()

        if not token or not text:
            return Response({'detail': 'chat_token and text are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > 4000:
            return Response({'detail': 'Message must be 4,000 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)

        chat_session = resolve_customer_chat_token(store, token)
        if not chat_session:
            return Response({'detail': 'Chat session expired. Start a new chat to continue.'}, status=status.HTTP_401_UNAUTHORIZED)
        conversation = chat_session['conversation']

        customer_name = str(request.data.get('customer_name') or '').strip()[:150]
        customer_phone = str(request.data.get('customer_phone') or '').strip()[:40]
        if not conversation:
            conversation = ChatConversation.objects.create(
                store=store,
                session_id=chat_session['session_id'],
                customer_name=str(customer_name or 'Customer').strip()[:150],
                customer_phone=customer_phone[:40],
            )
        elif customer_name:
            conversation.customer_name = str(customer_name).strip()[:150]
        if customer_phone:
            conversation.customer_phone = customer_phone[:40]

        conversation.last_message = text
        conversation.last_message_at = timezone.now()
        conversation.save()

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender_type=ChatMessage.SENDER_CUSTOMER,
            sender_name=customer_name or conversation.customer_name or 'Customer',
            text=text,
            is_read=False
        )

        message_data = ChatMessageSerializer(message).data

        # Broadcast live event to customer chat room and seller store inbox
        broadcast_order_event_sync(f"chat_{conversation.id}", {
            "type": "new_chat_message",
            "message": message_data,
            "conversation_id": conversation.id
        })
        from stores.models import SellerNotification
        SellerNotification.objects.create(
            store=store,
            notification_type='message',
            title=f"💬 Message from {customer_name or conversation.customer_name or 'Customer'}",
            body=f'"{text}" ({customer_phone or "No phone"})',
            link=f"/stores/{store.id}/chat"
        )

        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "new_customer_message",
            "customer_name": customer_name or conversation.customer_name or "Customer",
            "customer_phone": customer_phone,
            "text": text,
            "conversation_id": conversation.id
        })

        return Response(message_data, status=status.HTTP_201_CREATED)


class SellerListConversationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_store(self, request, store_id):
        return get_object_or_404(Store, id=store_id, owner=request.user)

    def get(self, request, store_id):
        store = self.get_store(request, store_id)
        conversations = store.conversations.filter(messages__isnull=False).distinct().order_by('-last_message_at', '-created_at')
        return Response(ChatConversationSerializer(conversations, many=True).data)

    def post(self, request, store_id):
        store = self.get_store(request, store_id)
        customer_name = request.data.get('customer_name', 'Customer')
        customer_phone = request.data.get('customer_phone', '').strip()
        initial_message = request.data.get('message', '').strip()

        session_id = f"seller_init_{generate_session_id()}"
        
        # If phone provided, check if conversation already exists
        if customer_phone:
            existing = store.conversations.filter(customer_phone=customer_phone).first()
            if existing:
                conversation = existing
                if customer_name and customer_name != 'Customer' and not customer_name.startswith('Guest Buyer'):
                    conversation.customer_name = customer_name
                    conversation.save()
            else:
                if not customer_name or customer_name == 'Customer':
                    customer_name = f"Customer ({customer_phone})"
                conversation = ChatConversation.objects.create(
                    store=store,
                    session_id=session_id,
                    customer_name=customer_name,
                    customer_phone=customer_phone
                )
        else:
            conversation = ChatConversation.objects.create(
                store=store,
                session_id=session_id,
                customer_name=customer_name or 'Customer',
                customer_phone=customer_phone
            )

        if initial_message:
            conversation.last_message = initial_message
            conversation.last_message_at = timezone.now()
            conversation.save()

            message = ChatMessage.objects.create(
                conversation=conversation,
                sender_type=ChatMessage.SENDER_SELLER,
                sender_name=store.name,
                text=initial_message,
                is_read=True
            )

            message_data = ChatMessageSerializer(message).data

            broadcast_order_event_sync(f"chat_{conversation.id}", {
                "type": "new_chat_message",
                "message": message_data,
                "conversation_id": conversation.id
            })

        return Response(ChatConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class SellerConversationMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_store_and_conversation(self, request, store_id, conversation_id):
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        conversation = get_object_or_404(ChatConversation, id=conversation_id, store=store)
        return store, conversation

    def get(self, request, store_id, conversation_id):
        store, conversation = self.get_store_and_conversation(request, store_id, conversation_id)
        
        # Mark unread customer messages as read
        conversation.messages.filter(sender_type=ChatMessage.SENDER_CUSTOMER, is_read=False).update(is_read=True)
        
        return Response(ChatConversationSerializer(conversation).data)

    def post(self, request, store_id, conversation_id):
        store, conversation = self.get_store_and_conversation(request, store_id, conversation_id)
        text = request.data.get('text', '').strip()

        if not text:
            return Response({'detail': 'Text message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        conversation.last_message = text
        conversation.last_message_at = timezone.now()
        conversation.save()

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender_type=ChatMessage.SENDER_SELLER,
            sender_name=store.name,
            text=text,
            is_read=True
        )

        message_data = ChatMessageSerializer(message).data

        # Broadcast live WS event
        broadcast_order_event_sync(f"chat_{conversation.id}", {
            "type": "new_chat_message",
            "message": message_data,
            "conversation_id": conversation.id
        })
        broadcast_order_event_sync(f"store_chats_{store.id}", {
            "type": "new_chat_message",
            "message": message_data,
            "conversation_id": conversation.id
        })

        return Response(message_data, status=status.HTTP_201_CREATED)


class PublicProductRequestAutoReplyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_chat'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        product_name = str(request.data.get('product_name') or 'a product').strip()[:150]
        cust_phone = str(request.data.get('customer_phone') or '').strip()[:40]
        cust_name = str(request.data.get('customer_name') or '').strip()[:150]

        if not cust_phone:
            return Response({'detail': 'customer_phone is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure conversation exists
        effective_name = cust_name if cust_name else f"Customer ({cust_phone})"
        token = request.data.get('chat_token', '')
        chat_session = resolve_customer_chat_token(store, token) if token else None
        if token and not chat_session:
            return Response({'detail': 'Chat session expired. Start a new chat to continue.'}, status=status.HTTP_401_UNAUTHORIZED)
        session_id = chat_session['session_id'] if chat_session else generate_session_id()
        conversation = chat_session['conversation'] if chat_session else None
        active_token = token or issue_customer_chat_token(store.id, session_id)

        # Create the product request only after the submitted chat credential
        # has been validated, so an expired token cannot create a partial request.
        from stores.models import ProductRequest
        ProductRequest.objects.create(
            store=store,
            customer_name=cust_name[:150],
            customer_phone=cust_phone[:40],
            product_name=product_name[:150],
            message=str(request.data.get('message', ''))[:2000],
        )

        if not conversation:
            conversation = ChatConversation.objects.create(
                store=store,
                session_id=session_id,
                customer_name=effective_name,
                customer_phone=cust_phone[:40],
            )
        else:
            if cust_name:
                conversation.customer_name = cust_name[:150]
            conversation.customer_phone = cust_phone[:40]
            conversation.save(update_fields=['customer_name', 'customer_phone'])

        text = f"Hi {effective_name}, thanks for requesting {product_name}. We will contact you soon with options."

        conversation.last_message = text
        conversation.last_message_at = timezone.now()
        conversation.save()

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender_type=ChatMessage.SENDER_SELLER,
            sender_name=store.name,
            text=text,
            is_read=False
        )

        message_data = ChatMessageSerializer(message).data

        # Broadcast live event to customer chat room and seller store inbox
        broadcast_order_event_sync(f"chat_{conversation.id}", {
            "type": "new_chat_message",
            "message": message_data,
            "conversation_id": conversation.id
        })
        from stores.models import SellerNotification
        SellerNotification.objects.create(
            store=store,
            notification_type='request',
            title=f"💡 Product Request: {product_name or 'Item'}",
            body=f"Requested by {cust_name or 'Customer'} ({cust_phone or 'No phone'})",
            link=f"/stores/{store.id}/requests"
        )

        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "new_product_request",
            "customer_name": cust_name or "Customer",
            "customer_phone": cust_phone,
            "product_name": product_name
        })

        message_data['chat_token'] = active_token
        return Response(message_data, status=status.HTTP_201_CREATED)

class SellerChatCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, store_id):
        from django.shortcuts import get_object_or_404
        from stores.models import Store
        from .models import ChatMessage
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        count = ChatMessage.objects.filter(
            conversation__store=store,
            sender_type=ChatMessage.SENDER_CUSTOMER,
            is_read=False
        ).count()
        return Response({'unread_count': count})
