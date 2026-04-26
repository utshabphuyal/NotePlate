"""User profile URL patterns"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views.users import UserViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='users')

urlpatterns = router.urls
