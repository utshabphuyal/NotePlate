"""
NotePlate Chat Models
Real-time one-to-one chat with message status tracking
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ChatRoom(models.Model):
    """A chat thread between two users, optionally linked to a book"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(User, related_name='chat_rooms')
    book = models.ForeignKey(
        'books.Book', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='chat_rooms'
    )
    borrow_request = models.ForeignKey(
        'borrowing.BorrowRequest', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='chat_room'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # Last message cache for performance
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_preview = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-last_message_at', '-created_at']

    def __str__(self):
        return f'Chat {self.id}'

    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()

    def unread_count_for(self, user):
        return self.messages.filter(
            is_read=False
        ).exclude(sender=user).count()

    @classmethod
    def get_or_create_room(cls, user1, user2, book=None):
        """Get existing room between two users (for same book), or create new"""
        if book:
            room = cls.objects.filter(
                participants=user1,
                book=book
            ).filter(participants=user2).first()
        else:
            room = cls.objects.filter(
                participants=user1
            ).filter(participants=user2).filter(book=None).first()

        if not room:
            room = cls.objects.create(book=book)
            room.participants.add(user1, user2)

        return room


class Message(models.Model):
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Text'
        IMAGE = 'image', 'Image'
        FILE = 'file', 'File'
        SYSTEM = 'system', 'System Message'
        BORROW_REQUEST = 'borrow_request', 'Borrow Request'

    class Status(models.TextChoices):
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(max_length=5000, blank=True)
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.TEXT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)

    # File attachments
    file = models.FileField(upload_to='chat/files/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=50, blank=True)  # MIME type

    # Reply
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies'
    )

    # Status tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Rate limiting
    created_at = models.DateTimeField(default=timezone.now)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
            models.Index(fields=['sender']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return f'Message from {self.sender} in {self.room}'

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.status = self.Status.READ
            self.save(update_fields=['is_read', 'read_at', 'status'])
