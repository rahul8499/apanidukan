from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from stores.models import Store
from .models import ChatConversation, ChatMessage, generate_session_id
from .serializers import ChatConversationSerializer, ChatMessageSerializer
from config.websocket import broadcast_order_event_sync


class PublicStoreChatView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_chat'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug)
        session_id = request.data.get('session_id') or generate_session_id()
        cust_phone = (request.data.get('customer_phone') or '').strip()
        cust_name = (request.data.get('customer_name') or '').strip()
        conversation = store.conversations.filter(session_id=session_id).first()

        if not conversation and cust_phone:
            conversation = store.conversations.filter(customer_phone=cust_phone).first()

        if cust_name and cust_name.lower() != 'customer' and not cust_name.startswith('Guest Buyer'):
            effective_name = cust_name
        elif cust_phone:
            effective_name = cust_name if (cust_name and cust_name.lower() != 'customer') else f"Customer ({cust_phone})"
        else:
            effective_name = f"Guest Buyer #{session_id[:6]}"

        if not conversation:
            if not request.data.get('text'):
                return Response({'conversation': None, 'messages': []}, status=status.HTTP_200_OK)

            conversation = ChatConversation.objects.create(
                store=store,
                session_id=session_id,
                customer_name=effective_name,
                customer_phone=cust_phone,
            )

            message = ChatMessage.objects.create(
                conversation=conversation,
                sender_type=ChatMessage.SENDER_CUSTOMER,
                sender_name=effective_name or 'Customer',
                text=request.data.get('text', '').strip(),
                is_read=False
            )

            conversation.last_message = message.text
            conversation.last_message_at = message.created_at
            conversation.save()

            message_data = ChatMessageSerializer(message).data

            broadcast_order_event_sync(f"chat_{conversation.id}", {
                "type": "new_chat_message",
                "message": message_data,
                "conversation_id": conversation.id
            })
            from stores.models import SellerNotification
            SellerNotification.objects.create(
                store=store,
                notification_type='message',
                title=f"💬 Message from {effective_name or 'Customer'}",
                body=f'"{message.text}" ({cust_phone or "No phone"})',
                link=f"/stores/{store.id}/chat"
            )

            broadcast_order_event_sync(f"store_{store.id}", {
                "type": "new_customer_message",
                "customer_name": effective_name or "Customer",
                "customer_phone": cust_phone,
                "text": message.text,
                "conversation_id": conversation.id
            })

            return Response(ChatConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)
        else:
            if session_id and conversation.session_id != session_id and not conversation.session_id.startswith('seller_init'):
                conversation.session_id = session_id
            if cust_name and cust_name.lower() != 'customer' and not cust_name.startswith('Guest Buyer'):
                conversation.customer_name = cust_name
            elif conversation.customer_name.startswith('Guest Buyer') and cust_phone:
                conversation.customer_name = effective_name
            if cust_phone and not conversation.customer_phone:
                conversation.customer_phone = cust_phone
            conversation.save()

        data = ChatConversationSerializer(conversation).data
        return Response(data, status=status.HTTP_200_OK)


class PublicSendChatMessageView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_chat'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug)
        session_id = request.data.get('session_id')
        text = request.data.get('text', '').strip()

        if not session_id or not text:
            return Response({'detail': 'session_id and text are required.'}, status=status.HTTP_400_BAD_REQUEST)

        conversation = store.conversations.filter(session_id=session_id).first()

        customer_name = request.data.get('customer_name') or ''
        customer_phone = (request.data.get('customer_phone') or '').strip()

        if not conversation:
            effective_name = customer_name if customer_name else (f"Customer ({customer_phone})" if customer_phone else f"Guest Buyer #{session_id[:6]}")
            conversation = ChatConversation.objects.create(
                store=store,
                session_id=session_id,
                customer_name=effective_name,
                customer_phone=customer_phone,
            )
        else:
            if customer_name and customer_name.lower() != 'customer' and not customer_name.startswith('Guest Buyer'):
                conversation.customer_name = customer_name
            elif conversation.customer_name.startswith('Guest Buyer') and customer_phone:
                conversation.customer_name = f"Customer ({customer_phone})"
            if customer_phone and not conversation.customer_phone:
                conversation.customer_phone = customer_phone
            conversation.save()

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
        store = get_object_or_404(Store, slug=slug)
        session_id = request.data.get('session_id')
        product_name = request.data.get('product_name', 'a product').strip()
        cust_phone = (request.data.get('customer_phone') or '').strip()
        cust_name = (request.data.get('customer_name') or '').strip()

        if not session_id or not cust_phone:
            return Response({'detail': 'session_id and customer_phone are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create Product Request in DB
        from stores.models import ProductRequest
        ProductRequest.objects.create(
            store=store,
            customer_name=cust_name,
            customer_phone=cust_phone,
            product_name=product_name,
            message=request.data.get('message', '')
        )

        # Ensure conversation exists
        conversation = store.conversations.filter(session_id=session_id).first()
        if not conversation:
            conversation = store.conversations.filter(customer_phone=cust_phone).first()

        effective_name = cust_name if cust_name else f"Customer ({cust_phone})"

        if not conversation:
            conversation = ChatConversation.objects.create(
                store=store,
                session_id=session_id,
                customer_name=effective_name,
                customer_phone=cust_phone,
            )
        else:
            if conversation.session_id != session_id:
                conversation.session_id = session_id
            if cust_name:
                conversation.customer_name = cust_name
            if cust_phone and not conversation.customer_phone:
                conversation.customer_phone = cust_phone
            conversation.save()

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
