"""
NotePlate Notifications System
In-app notifications with WebSocket push
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

NOTIFICATION_TYPES = (
    ('borrow_request', 'Borrow Request'),
    ('request_accepted', 'Request Accepted'),
    ('request_rejected', 'Request Rejected'),
    ('book_handed_over', 'Book Handed Over'),
    ('return_confirmed', 'Return Confirmed'),
    ('new_message', 'New Message'),
    ('extension_request', 'Extension Request'),
    ('overdue_warning', 'Overdue Warning'),
    ('rating_received', 'Rating Received'),
    ('report_resolved', 'Report Resolved'),
    ('system', 'System Notification'),
)


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    body = models.TextField(max_length=500)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['-created_at']),
        ]

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
