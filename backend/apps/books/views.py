"""
Book Views - Full CRUD, search, geolocation, recommendations
"""
import math
from django.db.models import Q, F
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Book, BookImage, SavedBook, Tag, BookReport
from .serializers import (
    BookSerializer, BookCreateSerializer, BookListSerializer,
    BookImageSerializer, TagSerializer, BookReportSerializer
)
from .filters import BookFilter
from utils.permissions import IsOwnerOrReadOnly, IsAdminUser

User = get_user_model()


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.filter(status__in=['active', 'reserved', 'borrowed'])
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BookFilter
    search_fields = ['title', 'author', 'subject', 'description', 'isbn']
    ordering_fields = ['created_at', 'view_count', 'title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return BookListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return BookCreateSerializer
        return BookSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        if self.action == 'create':
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        book = serializer.save(owner=self.request.user)
        # If no explicit location, use owner's location
        if not book.latitude and self.request.user.latitude:
            book.latitude = self.request.user.latitude
            book.longitude = self.request.user.longitude
            book.city = self.request.user.city
            book.save(update_fields=['latitude', 'longitude', 'city'])
        # Generate QR code async
        try:
            book.generate_qr_code()
            book.save(update_fields=['qr_code'])
        except Exception:
            pass

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increment_view()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """Find books near a coordinate"""
        try:
            lat = float(request.query_params.get('lat', 0))
            lon = float(request.query_params.get('lon', 0))
            radius_km = min(float(request.query_params.get('radius', 10)), 100)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates.'}, status=status.HTTP_400_BAD_REQUEST)

        # Bounding box pre-filter for performance
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))

        books = Book.objects.filter(
            status='active',
            latitude__range=(lat - lat_delta, lat + lat_delta),
            longitude__range=(lon - lon_delta, lon + lon_delta),
        ).exclude(owner=request.user if request.user.is_authenticated else None)

        # Apply availability filter
        availability = request.query_params.get('availability')
        if availability:
            books = books.filter(availability_type=availability)

        subject = request.query_params.get('subject')
        if subject:
            books = books.filter(Q(subject__icontains=subject) | Q(subjects__contains=subject))

        # Add distance and sort
        results = []
        for book in books:
            if book.latitude and book.longitude:
                dist = haversine_distance(lat, lon, book.latitude, book.longitude)
                if dist <= radius_km:
                    results.append({'book': book, 'distance_km': round(dist, 2)})

        results.sort(key=lambda x: x['distance_km'])

        serializer = BookListSerializer(
            [r['book'] for r in results],
            many=True,
            context={'request': request}
        )
        data = serializer.data
        for i, item in enumerate(data):
            item['distance_km'] = results[i]['distance_km']

        return Response({
            'count': len(data),
            'results': data,
            'center': {'lat': lat, 'lon': lon},
            'radius_km': radius_km,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def recommended(self, request):
        """AI-style recommendation based on user interests, subjects, location"""
        user = request.user
        scored_books = []

        base_qs = Book.objects.filter(
            status='active'
        ).exclude(owner=user).select_related('owner')

        for book in base_qs[:500]:  # Limit for performance
            score = 0

            # Subject match
            if user.subjects:
                for subject in user.subjects:
                    if subject.lower() in (book.subject or '').lower():
                        score += 30
                    if any(subject.lower() in s.lower() for s in (book.subjects or [])):
                        score += 20

            # Interest match
            if user.interests:
                for interest in user.interests:
                    if interest.lower() in (book.subject or '').lower():
                        score += 15
                    if interest.lower() in (book.description or '').lower():
                        score += 5

            # Location proximity
            if (user.latitude and user.longitude and
                    book.latitude and book.longitude):
                dist = haversine_distance(
                    user.latitude, user.longitude,
                    book.latitude, book.longitude
                )
                if dist < 2:
                    score += 50
                elif dist < 10:
                    score += 30
                elif dist < 50:
                    score += 10

            # Recency boost
            from django.utils import timezone
            days_old = (timezone.now() - book.created_at).days
            if days_old < 7:
                score += 20
            elif days_old < 30:
                score += 10

            # Owner reputation boost
            if book.owner.reputation_score > 100:
                score += 15

            if score > 0:
                scored_books.append((book, score))

        scored_books.sort(key=lambda x: x[1], reverse=True)
        top_books = [b for b, _ in scored_books[:20]]

        serializer = BookListSerializer(top_books, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': len(top_books)})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save_book(self, request, pk=None):
        """Save/unsave a book"""
        book = self.get_object()
        saved, created = SavedBook.objects.get_or_create(user=request.user, book=book)
        if not created:
            saved.delete()
            Book.objects.filter(pk=book.pk).update(save_count=F('save_count') - 1)
            return Response({'saved': False, 'message': 'Book removed from saved.'})
        Book.objects.filter(pk=book.pk).update(save_count=F('save_count') + 1)
        return Response({'saved': True, 'message': 'Book saved.'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def saved(self, request):
        """Get user's saved books"""
        saved_books = Book.objects.filter(
            saved_by__user=request.user,
            status='active'
        ).select_related('owner')
        serializer = BookListSerializer(saved_books, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': saved_books.count()})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def report(self, request, pk=None):
        """Report a book listing"""
        book = self.get_object()
        if book.owner == request.user:
            return Response({'error': 'Cannot report your own listing.'}, status=400)
        serializer = BookReportSerializer(data=request.data, context={'request': request, 'book': book})
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user, book=book)
        return Response({'message': 'Report submitted. Our team will review it.'})

    @action(detail=False, methods=['get'])
    def map_data(self, request):
        """Optimized endpoint for map markers - returns minimal data"""
        try:
            lat = float(request.query_params.get('lat', 0))
            lon = float(request.query_params.get('lon', 0))
            radius_km = min(float(request.query_params.get('radius', 25)), 100)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates.'}, status=400)

        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))

        books = Book.objects.filter(
            status='active',
            latitude__range=(lat - lat_delta, lat + lat_delta),
            longitude__range=(lon - lon_delta, lon + lon_delta),
        ).values(
            'id', 'title', 'author', 'subject', 'availability_type',
            'condition', 'latitude', 'longitude', 'city'
        )

        markers = []
        for b in books:
            if b['latitude'] and b['longitude']:
                dist = haversine_distance(lat, lon, b['latitude'], b['longitude'])
                if dist <= radius_km:
                    b['distance_km'] = round(dist, 2)
                    markers.append(b)

        return Response({'markers': markers, 'count': len(markers)})

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Get QR code for book"""
        book = self.get_object()
        if not book.qr_code:
            try:
                book.generate_qr_code()
                book.save(update_fields=['qr_code'])
            except Exception:
                return Response({'error': 'QR code generation failed.'}, status=500)
        request = self.request
        return Response({'qr_code_url': request.build_absolute_uri(book.qr_code.url)})
