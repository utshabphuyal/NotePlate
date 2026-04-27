"""
NotePlate User Models
Custom user with role-based access, location, and reputation system
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', False)  # Requires email verification
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        LIBRARY = 'library', 'Library'
        ADMIN = 'admin', 'Admin'

    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    avatar_cloudinary_url = models.URLField(null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    school_college = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)

    # Location (stored as GeoJSON-style)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Interests / Subjects
    interests = models.JSONField(default=list, blank=True)  # ['Mathematics', 'Physics']
    subjects = models.JSONField(default=list, blank=True)

    # Reputation & Stats
    reputation_score = models.IntegerField(default=0)
    total_lent = models.PositiveIntegerField(default=0)
    total_borrowed = models.PositiveIntegerField(default=0)
    total_donated = models.PositiveIntegerField(default=0)
    average_rating = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    rating_count = models.PositiveIntegerField(default=0)

    # Status flags
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True)
    ban_expires_at = models.DateTimeField(null=True, blank=True)

    # Email verification
    email_verified = models.BooleanField(default=False)
    email_verify_token = models.CharField(max_length=64, blank=True)
    email_verify_expires = models.DateTimeField(null=True, blank=True)

    # Password reset
    password_reset_token = models.CharField(max_length=64, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)

    # Settings
    notification_prefs = models.JSONField(default=dict, blank=True)
    privacy_settings = models.JSONField(default=dict, blank=True)
    preferred_language = models.CharField(max_length=10, default='en')
    dark_mode = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['role']),
            models.Index(fields=['city']),
            models.Index(fields=['reputation_score']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.email})'

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_library_account(self):
        return self.role == self.Role.LIBRARY

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN

    def update_reputation(self, points):
        self.reputation_score = max(0, self.reputation_score + points)
        self.save(update_fields=['reputation_score'])

    def update_average_rating(self, new_rating):
        total = self.average_rating * self.rating_count + new_rating
        self.rating_count += 1
        self.average_rating = total / self.rating_count
        self.save(update_fields=['average_rating', 'rating_count'])


class UserRating(models.Model):
    """User-to-user ratings after a borrow transaction"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_ratings')
    reviewed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_ratings')
    borrow_request = models.OneToOneField(
        'borrowing.BorrowRequest', on_delete=models.CASCADE, related_name='rating'
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(max_length=500, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'user_ratings'
        unique_together = ['reviewer', 'borrow_request']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.reviewed.update_average_rating(self.rating)


class BlockedUser(models.Model):
    """User block list"""
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'blocked_users'
        unique_together = ['blocker', 'blocked']


class UserReport(models.Model):
    """User reporting system"""
    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        FAKE_LISTING = 'fake_listing', 'Fake Listing'
        HARASSMENT = 'harassment', 'Harassment'
        SCAM = 'scam', 'Scam'
        INAPPROPRIATE = 'inappropriate', 'Inappropriate Content'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        REVIEWING = 'reviewing', 'Under Review'
        RESOLVED = 'resolved', 'Resolved'
        DISMISSED = 'dismissed', 'Dismissed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='filed_reports')
    reported = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_against')
    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.TextField(max_length=1000)
    evidence_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_reports'
        ordering = ['-created_at']
