"""
NotePlate ASGI Configuration
Handles both HTTP and WebSocket connections via Django Channels
"""
import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NotePlate_project.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from apps.chat.routing import websocket_urlpatterns as chat_ws
from apps.notifications.routing import websocket_urlpatterns as notif_ws

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(chat_ws + notif_ws)
        )
    ),
})
