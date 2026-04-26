"""
NotePlate Library Integration
Libraries register, add inventory, students can reserve
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Library(models.Model):
    """Library account with official inventory"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='library_profile')
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='India')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(max_length=1000, blank=True)
    logo = models.ImageField(upload_to='libraries/logos/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    opening_hours = models.JSONField(default=dict, blank=True)
    total_books = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'libraries'

    def __str__(self):
        return self.name


class LibraryBook(models.Model):
    """Official library inventory item"""
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        RESERVED = 'reserved', 'Reserved'
        CHECKED_OUT = 'checked_out', 'Checked Out'
        UNAVAILABLE = 'unavailable', 'Unavailable'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    library = models.ForeignKey(Library, on_delete=models.CASCADE, related_name='books')
    title = models.CharField(max_length=300)
    author = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=100)
    total_copies = models.PositiveSmallIntegerField(default=1)
    available_copies = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    call_number = models.CharField(max_length=50, blank=True)  # Library classification
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'library_books'


class LibraryReservation(models.Model):
    """Student reserves a library book"""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        READY = 'ready', 'Ready for Pickup'
        COLLECTED = 'collected', 'Collected'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    library_book = models.ForeignKey(LibraryBook, on_delete=models.CASCADE, related_name='reservations')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='library_reservations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reserved_at = models.DateTimeField(default=timezone.now)
    pickup_by = models.DateField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(max_length=300, blank=True)

    class Meta:
        db_table = 'library_reservations'
        ordering = ['-reserved_at']
