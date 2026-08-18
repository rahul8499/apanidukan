import json
import asyncio
import logging

logger = logging.getLogger(__name__)

# Active WebSocket connections grouped by topic
# Topic examples: "order_<reference>", "store_<store_id>"
_topic_subscribers = {}
_subscriber_lock = asyncio.Lock()


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
    """Synchronous helper called from Django sync views to push WS updates."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcast_to_topic(topic, data))
        else:
            loop.run_until_complete(broadcast_to_topic(topic, data))
    except Exception:
        # If no running event loop in current thread, schedule on new loop in thread pool
        try:
            asyncio.run(broadcast_to_topic(topic, data))
        except Exception as err:
            logger.error(f"Error broadcasting WS event: {err}")


async def websocket_application(scope, receive, send):
    """
    ASGI WebSocket Application endpoint.
    Handles:
      ws://<host>/ws/order/<reference>/
      ws://<host>/ws/store/<store_id>/
    """
    path = scope.get('path', '')
    parts = [p for p in path.strip('/').split('/') if p]

    # Expected path: ['ws', 'order', '<reference>'] or ['ws', 'store', '<store_id>']
    if len(parts) >= 3 and parts[0] == 'ws':
        topic_type = parts[1]
        topic_id = parts[2]
        topic = f"{topic_type}_{topic_id}"
    else:
        topic = 'general'

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
