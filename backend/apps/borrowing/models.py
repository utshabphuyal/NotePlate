"""
NotePlate Borrowing System
Request, accept, track, and return books
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

User = get_user_model()


class BorrowRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        ACTIVE = 'active', 'Active (Book Handed Over)'
        RETURNED = 'returned', 'Returned'
        CANCELLED = 'cancelled', 'Cancelled'
        OVERDUE = 'overdue', 'Overdue'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book = models.ForeignKey('books.Book', on_delete=models.CASCADE, related_name='borrow_requests')
    borrower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrow_requests')
    lender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lend_requests')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Timing
    requested_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    handed_over_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)

    # Duration
    requested_duration_days = models.PositiveSmallIntegerField(default=14)
    actual_duration_days = models.PositiveSmallIntegerField(null=True, blank=True)
    extension_requested = models.BooleanField(default=False)
    extension_days = models.PositiveSmallIntegerField(null=True, blank=True)
    extension_approved = models.BooleanField(null=True)

    # Notes
    borrower_note = models.TextField(max_length=500, blank=True)
    rejection_reason = models.TextField(max_length=500, blank=True)

    # Confirmation codes
    handover_code = models.CharField(max_length=8, blank=True)
    return_code = models.CharField(max_length=8, blank=True)

    # Late tracking
    is_overdue = models.BooleanField(default=False)
    overdue_days = models.PositiveSmallIntegerField(default=0)
    late_return_warned = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'borrow_requests'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['borrower', 'status']),
            models.Index(fields=['lender', 'status']),
            models.Index(fields=['book', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f'{self.borrower} wants to borrow {self.book.title} from {self.lender}'

    def generate_handover_code(self):
        import secrets
        self.handover_code = secrets.token_hex(4).upper()
        self.save(update_fields=['handover_code'])
        return self.handover_code

    def generate_return_code(self):
        import secrets
        self.return_code = secrets.token_hex(4).upper()
        self.save(update_fields=['return_code'])
        return self.return_code

    def calculate_overdue(self):
        if self.due_date and self.status == self.Status.ACTIVE:
            today = timezone.now().date()
            if today > self.due_date:
                self.overdue_days = (today - self.due_date).days
                self.is_overdue = True
                self.status = self.Status.OVERDUE
                self.save(update_fields=['overdue_days', 'is_overdue', 'status'])
                return True
        return False
