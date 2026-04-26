"""Auth URL patterns"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views.auth import (
    LoginView, RegisterView, verify_email, resend_verification,
    forgot_password, reset_password, logout
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('forgot-password/', forgot_password, name='forgot_password'),
    path('reset-password/', reset_password, name='reset_password'),
    path('logout/', logout, name='logout'),
]
