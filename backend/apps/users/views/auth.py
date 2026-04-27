"""
Authentication Views: Register, Login, Email Verify, Password Reset
"""
import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from ..serializers import (
    CustomTokenObtainPairSerializer, RegisterSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer
)

User = get_user_model()


class LoginThrottle(AnonRateThrottle):
    rate = '10/minute'
    scope = 'login'


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]


class RegisterView(generics.CreateAPIView):
    """User registration - auto verified"""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-verify email (email service not configured)
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=['email_verified', 'is_active'])

        return Response({
            'message': 'Registration successful. You can now log in.',
            'email': user.email,
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify user email with token"""
    token = request.data.get('token', '')
    if not token:
        return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    try:
        user = User.objects.get(
            email_verify_token=token_hash,
            email_verify_expires__gte=timezone.now()
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired verification token.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.email_verified = True
    user.is_active = True
    user.email_verify_token = ''
    user.email_verify_expires = None
    user.save(update_fields=['email_verified', 'is_active', 'email_verify_token', 'email_verify_expires'])

    return Response({'message': 'Email verified successfully. You can now log in.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    """Resend email verification"""
    email = request.data.get('email', '')
    try:
        user = User.objects.get(email=email, email_verified=False)
    except User.DoesNotExist:
        return Response({'message': 'If that email exists, a verification link has been sent.'})

    token = secrets.token_urlsafe(32)
    user.email_verify_token = hashlib.sha256(token.encode()).hexdigest()
    user.email_verify_expires = timezone.now() + timedelta(hours=24)
    user.save(update_fields=['email_verify_token', 'email_verify_expires'])

    return Response({'message': 'If that email exists, a verification link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send password reset email"""
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']

    try:
        user = User.objects.get(email=email, is_active=True)
        token = secrets.token_urlsafe(32)
        user.password_reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.password_reset_expires = timezone.now() + timedelta(hours=2)
        user.save(update_fields=['password_reset_token', 'password_reset_expires'])

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_mail(
            subject='Reset your NotePlate password',
            message=f'Reset link: {reset_url} (expires in 2 hours)',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass

    return Response({'message': 'If that email exists, a password reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with token"""
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    token_hash = hashlib.sha256(serializer.validated_data['token'].encode()).hexdigest()
    try:
        user = User.objects.get(
            password_reset_token=token_hash,
            password_reset_expires__gte=timezone.now()
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired reset token.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(serializer.validated_data['new_password'])
    user.password_reset_token = ''
    user.password_reset_expires = None
    user.save(update_fields=['password', 'password_reset_token', 'password_reset_expires'])

    return Response({'message': 'Password reset successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Blacklist refresh token"""
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logged out successfully.'})
    except Exception:
        return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)