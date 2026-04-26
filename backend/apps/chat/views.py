"""Chat REST views"""
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer

User = get_user_model()


class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        return ChatRoom.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related('participants').order_by('-last_message_at', '-created_at')

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start or get a chat with another user"""
        other_user_id = request.data.get('user_id')
        book_id = request.data.get('book_id')

        try:
            other_user = User.objects.get(id=other_user_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        if other_user == request.user:
            return Response({'error': 'Cannot chat with yourself.'}, status=400)

        # Check if blocked
        from apps.users.models import BlockedUser
        if BlockedUser.objects.filter(
            blocker=other_user, blocked=request.user
        ).exists():
            return Response({'error': 'Unable to start chat.'}, status=403)

        book = None
        if book_id:
            from apps.books.models import Book
            try:
                book = Book.objects.get(id=book_id)
            except Book.DoesNotExist:
                pass

        room = ChatRoom.get_or_create_room(request.user, other_user, book)
        serializer = ChatRoomSerializer(room, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for a chat room"""
        room = self.get_object()
        if not room.participants.filter(id=request.user.id).exists():
            return Response({'error': 'Access denied.'}, status=403)

        messages = room.messages.filter(is_deleted=False).select_related('sender', 'reply_to__sender')
        # Mark messages as read
        unread = messages.filter(is_read=False).exclude(sender=request.user)
        unread.update(is_read=True, status='read')

        from utils.pagination import StandardResultsPagination
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(
            messages.order_by('-created_at'), request
        )
        serializer = MessageSerializer(reversed(page), many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['get'])
    def unread_count(self, request, pk=None):
        room = self.get_object()
        count = room.unread_count_for(request.user)
        return Response({'unread': count})


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Message.objects.filter(
            room__participants=self.request.user,
            is_deleted=False
        ).select_related('sender', 'reply_to__sender')

    def perform_create(self, serializer):
     message = serializer.save(sender=self.request.user)
    # Update room preview
     room = message.room
     room.last_message_preview = message.content[:100]
     from django.utils import timezone
     room.last_message_at = timezone.now()
     room.save(update_fields=['last_message_preview', 'last_message_at'])

    def perform_destroy(self, instance):
        if instance.sender != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Cannot delete others\' messages.')
        from django.utils import timezone
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.content = '[Message deleted]'
        instance.save(update_fields=['is_deleted', 'deleted_at', 'content'])
