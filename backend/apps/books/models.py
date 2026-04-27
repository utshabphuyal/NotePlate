"""
NotePlate Book & Materials Models
Comprehensive listing system with geo-location and tagging
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(max_length=50, unique=True)
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'tags'
        ordering = ['-usage_count']

    def __str__(self):
        return self.name


class Book(models.Model):
    class MaterialType(models.TextChoices):
        BOOK = 'book', 'Book'
        NOTES = 'notes', 'Notes'
        PDF = 'pdf', 'PDF'
        MAGAZINE = 'magazine', 'Magazine'
        TEXTBOOK = 'textbook', 'Textbook'
        OTHER = 'other', 'Other'

    class Condition(models.TextChoices):
        NEW = 'new', 'New'
        LIKE_NEW = 'like_new', 'Like New'
        GOOD = 'good', 'Good'
        FAIR = 'fair', 'Fair'
        POOR = 'poor', 'Poor'

    class AvailabilityType(models.TextChoices):
        BORROW = 'borrow', 'Available to Borrow'
        DONATE = 'donate', 'Donation'
        EXCHANGE = 'exchange', 'Exchange Only'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        BORROWED = 'borrowed', 'Currently Borrowed'
        RESERVED = 'reserved', 'Reserved'
        DONATED = 'donated', 'Donated'
        INACTIVE = 'inactive', 'Inactive'
        REMOVED = 'removed', 'Removed by Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')

    # Core info
    title = models.CharField(max_length=300, db_index=True)
    author = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=20, blank=True, db_index=True)
    publisher = models.CharField(max_length=200, blank=True)
    publication_year = models.PositiveSmallIntegerField(null=True, blank=True)
    edition = models.CharField(max_length=50, blank=True)
    description = models.TextField(max_length=2000, blank=True)
    language = models.CharField(max_length=50, default='English')

    # Classification
    material_type = models.CharField(max_length=20, choices=MaterialType.choices, default=MaterialType.BOOK)
    subject = models.CharField(max_length=100, db_index=True)
    subjects = models.JSONField(default=list, blank=True)  # Multiple subjects
    grade_level = models.CharField(max_length=50, blank=True)  # e.g., "Undergraduate Year 2"

    # Availability
    availability_type = models.CharField(
        max_length=20, choices=AvailabilityType.choices, default=AvailabilityType.BORROW
    )
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.GOOD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    max_borrow_days = models.PositiveSmallIntegerField(default=14)
    is_free = models.BooleanField(default=True)

    # Location (can differ from owner's location)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True, db_index=True)
    pickup_instructions = models.TextField(max_length=500, blank=True)

    # Digital content
    pdf_file = models.FileField(upload_to='books/pdfs/', null=True, blank=True)
    digital_only = models.BooleanField(default=False)

    # Metadata
    tags = models.ManyToManyField(Tag, blank=True, related_name='books')
    view_count = models.PositiveIntegerField(default=0)
    save_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)

    # QR code
    qr_code = models.ImageField(upload_to='books/qr_codes/', null=True, blank=True)

    # Admin
    admin_notes = models.TextField(blank=True)
    removed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='removed_books'
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'books'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['subject']),
            models.Index(fields=['status']),
            models.Index(fields=['city']),
            models.Index(fields=['availability_type']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.title} by {self.author or "Unknown"}'

    def increment_view(self):
        Book.objects.filter(pk=self.pk).update(view_count=models.F('view_count') + 1)

    def generate_qr_code(self):
        import qrcode
        from io import BytesIO
        from django.core.files.base import ContentFile
        from django.conf import settings

        qr_url = f"{settings.FRONTEND_URL}/books/{self.id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        self.qr_code.save(f'book_{self.id}.png', ContentFile(buffer.getvalue()), save=False)


class BookImage(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='books/images/', null=True, blank=True)
    cloudinary_url = models.URLField(null=True, blank=True)
    is_cover = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'book_images'
        ordering = ['order', '-is_cover']


class SavedBook(models.Model):
    """User bookmarks / saved books"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_books')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'saved_books'
        unique_together = ['user', 'book']


class BookReport(models.Model):
    """Report a listing"""
    class Reason(models.TextChoices):
        FAKE = 'fake', 'Fake Listing'
        SPAM = 'spam', 'Spam'
        INAPPROPRIATE = 'inappropriate', 'Inappropriate Content'
        ALREADY_GONE = 'already_gone', 'Book No Longer Available'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='book_reports')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.TextField(max_length=500, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('reviewed', 'Reviewed'), ('dismissed', 'Dismissed')],
        default='pending'
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'book_reports'
        unique_together = ['reporter', 'book']
