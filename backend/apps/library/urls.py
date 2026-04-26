"""Library URLs"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import LibraryViewSet, LibraryBookViewSet, LibraryReservationViewSet

router = DefaultRouter()
router.register(r'libraries', LibraryViewSet, basename='libraries')
router.register(r'inventory', LibraryBookViewSet, basename='library-books')
router.register(r'reservations', LibraryReservationViewSet, basename='library-reservations')
urlpatterns = router.urls
