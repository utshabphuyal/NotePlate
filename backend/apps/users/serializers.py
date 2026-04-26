"""
User Serializers - Registration, Login, Profile management
"""
import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserRating, BlockedUser, UserReport

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Add custom claims to JWT tokens"""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['username'] = user.username
        token['role'] = user.role
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if user.is_banned:
            raise serializers.ValidationError(
                {'non_field_errors': [f'Your account has been banned. Reason: {user.ban_reason}']}
            )

        if not user.email_verified:
            raise serializers.ValidationError(
                {'non_field_errors': ['Please verify your email address before logging in.']}
            )

        # Update last active
        user.last_active = timezone.now()
        user.save(update_fields=['last_active'])

        data['user'] = UserPublicSerializer(user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'full_name', 'password',
            'password_confirm', 'role', 'school_college'
        ]

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', value):
            raise serializers.ValidationError(
                'Username must be 3-50 characters and contain only letters, numbers, underscores.'
            )
        return value.lower()

    def validate_role(self, value):
        # Admin role cannot be self-assigned
        if value == User.Role.ADMIN:
            raise serializers.ValidationError('Cannot register as admin.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal public profile data"""
    avatar_url = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'avatar_url', 'school_college',
            'reputation_score', 'average_rating', 'rating_count',
            'total_lent', 'total_borrowed', 'role', 'city', 'created_at',
            'is_blocked'
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_is_blocked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user != obj:
            return BlockedUser.objects.filter(blocker=request.user, blocked=obj).exists()
        return False


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile data for authenticated user"""
    avatar_url = serializers.SerializerMethodField()
    is_blocked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'avatar', 'avatar_url',
            'bio', 'school_college', 'phone', 'website',
            'latitude', 'longitude', 'address', 'city', 'country',
            'interests', 'subjects',
            'reputation_score', 'average_rating', 'rating_count',
            'total_lent', 'total_borrowed', 'total_donated',
            'role', 'is_verified', 'email_verified',
            'notification_prefs', 'privacy_settings',
            'preferred_language', 'dark_mode',
            'created_at', 'last_active',
            'is_blocked_by_me',
        ]
        read_only_fields = [
            'id', 'email', 'reputation_score', 'average_rating',
            'rating_count', 'total_lent', 'total_borrowed', 'total_donated',
            'is_verified', 'email_verified', 'created_at', 'last_active',
            'is_blocked_by_me',
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_is_blocked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user != obj:
            return BlockedUser.objects.filter(blocker=request.user, blocked=obj).exists()
        return False


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'full_name', 'bio', 'school_college', 'phone', 'website',
            'latitude', 'longitude', 'address', 'city', 'country',
            'interests', 'subjects', 'notification_prefs',
            'privacy_settings', 'preferred_language', 'dark_mode',
        ]

    def validate_interests(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Interests must be a list.')
        if len(value) > 20:
            raise serializers.ValidationError('Maximum 20 interests allowed.')
        return [str(i)[:50] for i in value]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class UserRatingSerializer(serializers.ModelSerializer):
    reviewer = UserPublicSerializer(read_only=True)

    class Meta:
        model = UserRating
        fields = ['id', 'reviewer', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'reviewer', 'created_at']


class UserReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserReport
        fields = ['id', 'reported', 'reason', 'description', 'evidence_url', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        reported = attrs.get('reported')

        if request and request.user == reported:
            raise serializers.ValidationError('You cannot report yourself.')

        # Check for duplicate recent report
        from django.utils import timezone
        from datetime import timedelta
        recent_cutoff = timezone.now() - timedelta(days=1)
        if UserReport.objects.filter(
            reporter=request.user,
            reported=reported,
            created_at__gte=recent_cutoff
        ).exists():
            raise serializers.ValidationError('You have already reported this user recently.')

        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs
