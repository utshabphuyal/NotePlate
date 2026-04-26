"""Notifications URLs"""
from django.urls import path
from .views import NotificationViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')
urlpatterns = router.urls
