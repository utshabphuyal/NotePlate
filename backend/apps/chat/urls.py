"""Chat URLs"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatrooms')
router.register(r'messages', MessageViewSet, basename='messages')

urlpatterns = router.urls
