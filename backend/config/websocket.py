import json
import asyncio
import logging
from urllib.parse import parse_qs
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

# Active WebSocket connections grouped by topic
# Topic examples: "order_<reference>", "store_<store_id>", "delivery_agent_<id>"
_topic_subscribers = {}
_subscriber_lock = asyncio.Lock()
_websocket_loop = None


@sync_to_async
def _can_access_seller_topic(raw_token: str, store_id: str) -> bool:
    """Validate both the JWT and ownership before exposing seller events."""
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from stores.models import Store
        auth = JWTAuthentication()
        validated_token = auth.get_validated_token(raw_token)
        user = auth.get_user(validated_token)
        return bool(user.is_active and (user.is_staff or Store.objects.filter(id=store_id, owner=user).exists()))
    except Exception:
        return False


@sync_to_async
def _can_access_delivery_agent_topic(raw_token: str, agent_id: str) -> bool:
    """Only the active agent's own JWT may subscribe to their private topic."""
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from stores.models import DeliveryAgent
        auth = JWTAuthentication()
        validated_token = auth.get_validated_token(raw_token)
        user = auth.get_user(validated_token)
        return bool(
            user.is_active
            and DeliveryAgent.objects.filter(id=agent_id, user=user, is_active=True).exists()
        )
    except Exception:
        return False


@sync_to_async
def _can_access_customer_chat(conversation_id: str, chat_token: str) -> bool:
    try:
        from django.core import signing
        from chat.models import ChatConversation
        payload = signing.loads(chat_token, salt='customer-chat-access', max_age=60 * 60 * 24 * 90)
        return bool(
            len(str(payload.get('session_id') or '')) == 32
            and ChatConversation.objects.filter(
                id=conversation_id,
                store_id=payload.get('store_id'),
                session_id=payload.get('session_id'),
                store__is_published=True,
            ).exists()
        )
    except Exception:
        return False


@sync_to_async
def _can_access_order_topic(reference: str, token: str) -> bool:
    """Validate customer tracking token or seller JWT access for an order topic."""
    try:
        from orders.models import WhatsAppOrder
        order = WhatsAppOrder.objects.filter(reference=reference).select_related('store__owner').first()
        if not order:
            return False
        # 1. Customer token check (tracking_token match)
        clean_token = (token or '').strip()
        if clean_token and str(order.tracking_token) == clean_token:
            return True
        # 2. Seller JWT check
        if clean_token:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            auth = JWTAuthentication()
            validated_token = auth.get_validated_token(clean_token)
            user = auth.get_user(validated_token)
            if user.is_active and (user.is_staff or order.store.owner_id == user.id):
                return True
        return False
    except Exception:
        return False



async def add_subscriber(topic: str, send_func):
    async with _subscriber_lock:
        if topic not in _topic_subscribers:
            _topic_subscribers[topic] = set()
        _topic_subscribers[topic].add(send_func)


async def remove_subscriber(topic: str, send_func):
    async with _subscriber_lock:
        if topic in _topic_subscribers:
            _topic_subscribers[topic].discard(send_func)
            if not _topic_subscribers[topic]:
                del _topic_subscribers[topic]


async def broadcast_to_topic(topic: str, data: dict):
    async with _subscriber_lock:
        subscribers = list(_topic_subscribers.get(topic, []))

    if not subscribers:
        return

    payload = json.dumps(data)
    message = {'type': 'websocket.send', 'text': payload}

    for send_func in subscribers:
        try:
            await send_func(message)
        except Exception as e:
            logger.warning(f"Failed to send WS message to subscriber on topic {topic}: {e}")


def broadcast_order_event_sync(topic: str, data: dict):
    """Schedule a view-originated event on the ASGI loop that owns subscribers."""
    loop = _websocket_loop
    if loop is None or not loop.is_running():
        logger.debug("Skipping WebSocket broadcast for %s: no active WebSocket loop", topic)
        return

    try:
        running_loop = asyncio.get_running_loop()
    except RuntimeError:
        running_loop = None

    if running_loop is loop:
        loop.create_task(broadcast_to_topic(topic, data))
    else:
        future = asyncio.run_coroutine_threadsafe(broadcast_to_topic(topic, data), loop)
        future.add_done_callback(
            lambda completed: logger.error("WebSocket broadcast failed for %s: %s", topic, completed.exception())
            if completed.exception() else None
        )


def broadcast_delivery_agent_event_sync(agent_id: int, data: dict):
    broadcast_order_event_sync(f'delivery_agent_{agent_id}', data)


async def websocket_application(scope, receive, send):
    """
    ASGI WebSocket Application endpoint.
    Handles:
      ws://<host>/ws/order/<reference>/
    ws://<host>/ws/store/<store_id>/
    ws://<host>/ws/delivery-agent/<agent_id>/?token=<access-jwt>
    """
    global _websocket_loop
    _websocket_loop = asyncio.get_running_loop()
    path = scope.get('path', '')
    parts = [p for p in path.strip('/').split('/') if p]
    query = parse_qs(scope.get('query_string', b'').decode('utf-8', errors='ignore'))

    # Expected path: ['ws', 'order', '<reference>'], ['ws', 'store', '<id>'],
    # or ['ws', 'delivery-agent', '<agent_id>'].
    if len(parts) >= 3 and parts[0] == 'ws':
        topic_type = parts[1]
        topic_id = parts[2]
        if topic_type == 'order':
            token = query.get('token', [''])[0]
            if not await _can_access_order_topic(topic_id, token):
                await send({'type': 'websocket.close', 'code': 4403})
                return
        elif topic_type in {'store', 'store_chats'}:
            token = query.get('token', [''])[0]
            if not await _can_access_seller_topic(token, topic_id):
                await send({'type': 'websocket.close', 'code': 4403})
                return
        elif topic_type == 'delivery-agent':
            token = query.get('token', [''])[0]
            if not await _can_access_delivery_agent_topic(token, topic_id):
                await send({'type': 'websocket.close', 'code': 4403})
                return
        elif topic_type == 'chat':
            chat_token = query.get('chat_token', [''])[0]
            if not await _can_access_customer_chat(topic_id, chat_token):
                await send({'type': 'websocket.close', 'code': 4403})
                return
        else:
            await send({'type': 'websocket.close', 'code': 4403})
            return
        topic_name = 'delivery_agent' if topic_type == 'delivery-agent' else topic_type
        topic = f"{topic_name}_{topic_id}"
    else:
        await send({'type': 'websocket.close', 'code': 4403})
        return

    await send({'type': 'websocket.accept'})
    await add_subscriber(topic, send)

    try:
        # Initial welcome message
        await send({
            'type': 'websocket.send',
            'text': json.dumps({'type': 'connection_established', 'topic': topic})
        })

        while True:
            event = await receive()
            event_type = event.get('type')

            if event_type == 'websocket.disconnect':
                break
            elif event_type == 'websocket.receive':
                # Echo ping/pong or process incoming message
                text = event.get('text', '')
                if text == 'ping':
                    await send({'type': 'websocket.send', 'text': json.dumps({'type': 'pong'})})
    finally:
        await remove_subscriber(topic, send)
