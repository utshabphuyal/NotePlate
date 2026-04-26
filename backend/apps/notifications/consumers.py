"""
Notifications WebSocket Consumer
Push real-time notifications to connected users
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger('apps.notifications')
User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token_qs = self.scope['query_string'].decode()
        token_parts = token_qs.split('token=')
        if len(token_parts) < 2:
            await self.close(code=4001)
            return

        token = token_parts[1].split('&')[0]
        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user = user
        self.group_name = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send unread count on connect
        unread = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mark_read':
            notification_ids = data.get('ids', [])
            await self.mark_notifications_read(notification_ids)

    # ─── Event handlers ───────────────────────────────────────────────────────

    async def new_notification(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))

    async def unread_count_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': event['count'],
        }))

    # ─── DB ops ───────────────────────────────────────────────────────────────

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            validated = AccessToken(token)
            return User.objects.get(id=validated['user_id'], is_active=True)
        except Exception:
            return None

    @database_sync_to_async
    def get_unread_count(self):
        from .models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_notifications_read(self, ids):
        from .models import Notification
        from django.utils import timezone
        Notification.objects.filter(id__in=ids, user=self.user).update(
            is_read=True, read_at=timezone.now()
        )


def send_notification_to_user(user_id, notification):
    """
    Utility to send a notification over WebSocket from Django views.
    Call this after creating a Notification object.
    """
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    group_name = f'notifications_{user_id}'

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'new_notification',
            'notification': {
                'id': str(notification.id),
                'notification_type': notification.notification_type,
                'title': notification.title,
                'body': notification.body,
                'data': notification.data,
                'created_at': notification.created_at.isoformat(),
            }
        }
    )
