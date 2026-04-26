"""Borrowing URLs"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import BorrowRequestViewSet

router = DefaultRouter()
router.register(r'', BorrowRequestViewSet, basename='borrows')
urlpatterns = router.urls
