"""
NotePlate WebSocket Chat Consumer
Handles real-time messaging with message status updates
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

logger = logging.getLogger('apps.chat')
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Authenticate and join room group"""
        # JWT auth from query string
        token_key = self.scope['query_string'].decode().split('token=')
        if len(token_key) < 2:
            await self.close(code=4001)
            return

        token = token_key[1].split('&')[0]
        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user = user
        self.room_id = self.scope['url_route']['kwargs']['room_id']

        # Verify user is participant
        is_participant = await self.verify_participation(self.room_id, user)
        if not is_participant:
            await self.close(code=4003)
            return

        self.room_group_name = f'chat_{self.room_id}'

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Mark user as online in this room
        await self.update_user_presence(True)

        # Notify others of online status
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'user_status', 'user_id': str(user.id), 'online': True}
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.update_user_presence(False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'user_status', 'user_id': str(self.user.id), 'online': False}
            )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        handlers = {
            'send_message': self.handle_send_message,
            'mark_read': self.handle_mark_read,
            'typing': self.handle_typing,
            'delete_message': self.handle_delete_message,
        }

        handler = handlers.get(msg_type)
        if handler:
            await handler(data)

    async def handle_send_message(self, data):
        """Save and broadcast a new message"""
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        reply_to_id = data.get('reply_to')

        if not content and message_type == 'text':
            return

        # Rate limiting: check message frequency
        can_send = await self.check_rate_limit()
        if not can_send:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You are sending messages too quickly. Please slow down.'
            }))
            return

        # Save to database
        message = await self.save_message(content, message_type, reply_to_id)
        if not message:
            return

        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': await self.serialize_message(message),
            }
        )

        # Send push notification to recipient
        await self.send_notification(message)

    async def handle_mark_read(self, data):
        """Mark messages as read"""
        message_ids = data.get('message_ids', [])
        await self.mark_messages_read(message_ids)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'messages_read',
                'message_ids': message_ids,
                'read_by': str(self.user.id),
            }
        )

    async def handle_typing(self, data):
        """Broadcast typing indicator"""
        is_typing = data.get('is_typing', False)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': is_typing,
            }
        )

    async def handle_delete_message(self, data):
        """Soft-delete a message"""
        message_id = data.get('message_id')
        success = await self.delete_message(message_id)
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_deleted', 'message_id': message_id}
            )

    # ─── Event handlers (group_send receivers) ───────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message'],
        }))

    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'message_ids': event['message_ids'],
            'read_by': event['read_by'],
        }))

    async def typing_indicator(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def user_status(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_status',
                'user_id': event['user_id'],
                'online': event['online'],
            }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
        }))

    # ─── Database operations ──────────────────────────────────────────────────

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            validated = AccessToken(token)
            return User.objects.get(id=validated['user_id'], is_active=True)
        except (TokenError, InvalidToken, User.DoesNotExist, Exception):
            return None

    @database_sync_to_async
    def verify_participation(self, room_id, user):
        from .models import ChatRoom
        try:
            return ChatRoom.objects.filter(id=room_id, participants=user).exists()
        except Exception:
            return False

    @database_sync_to_async
    def save_message(self, content, message_type, reply_to_id):
        from .models import ChatRoom, Message
        try:
            room = ChatRoom.objects.get(id=self.room_id)
            reply_to = None
            if reply_to_id:
                try:
                    reply_to = Message.objects.get(id=reply_to_id, room=room)
                except Message.DoesNotExist:
                    pass

            message = Message.objects.create(
                room=room,
                sender=self.user,
                content=content,
                message_type=message_type,
                reply_to=reply_to,
            )
            # Update room's last message cache
            room.last_message_at = message.created_at
            room.last_message_preview = content[:97] + '...' if len(content) > 100 else content
            room.save(update_fields=['last_message_at', 'last_message_preview'])
            return message
        except Exception as e:
            logger.error(f'Error saving message: {e}')
            return None

    @database_sync_to_async
    def serialize_message(self, message):
        return {
            'id': str(message.id),
            'content': message.content,
            'message_type': message.message_type,
            'status': message.status,
            'sender': {
                'id': str(message.sender.id),
                'username': message.sender.username,
                'full_name': message.sender.full_name,
            },
            'reply_to': str(message.reply_to_id) if message.reply_to_id else None,
            'created_at': message.created_at.isoformat(),
            'is_edited': message.is_edited,
        }

    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        from .models import Message
        Message.objects.filter(
            id__in=message_ids,
            room_id=self.room_id,
            is_read=False
        ).exclude(sender=self.user).update(
            is_read=True,
            read_at=timezone.now(),
            status='read'
        )

    @database_sync_to_async
    def delete_message(self, message_id):
        from .models import Message
        try:
            msg = Message.objects.get(id=message_id, sender=self.user, room_id=self.room_id)
            msg.is_deleted = True
            msg.deleted_at = timezone.now()
            msg.content = '[Message deleted]'
            msg.save(update_fields=['is_deleted', 'deleted_at', 'content'])
            return True
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def check_rate_limit(self):
        """Allow max 60 messages per minute per user"""
        from .models import Message
        from datetime import timedelta
        one_minute_ago = timezone.now() - timedelta(minutes=1)
        count = Message.objects.filter(
            sender=self.user,
            room_id=self.room_id,
            created_at__gte=one_minute_ago
        ).count()
        return count < 60

    @database_sync_to_async
    def update_user_presence(self, online):
        User.objects.filter(id=self.user.id).update(
            last_active=timezone.now() if online else None
        )

    @database_sync_to_async
    def send_notification(self, message):
        """Create in-app notification for the recipient"""
        from apps.notifications.models import Notification
        from .models import ChatRoom

        room = ChatRoom.objects.get(id=self.room_id)
        recipient = room.get_other_participant(self.user)
        if recipient:
            Notification.objects.create(
                user=recipient,
                notification_type='new_message',
                title=f'New message from {self.user.full_name}',
                body=message.content[:100] if message.content else 'Sent a file',
                data={
                    'room_id': str(room.id),
                    'sender_id': str(self.user.id),
                    'message_id': str(message.id),
                }
            )
