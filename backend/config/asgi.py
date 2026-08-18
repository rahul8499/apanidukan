import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from config.websocket import websocket_application


async def application(scope, receive, send):
    if scope['type'] == 'websocket':
        await websocket_application(scope, receive, send)
    else:
        await django_asgi_app(scope, receive, send)
