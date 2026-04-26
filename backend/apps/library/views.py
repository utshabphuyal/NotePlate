"""Library views"""
from rest_framework import viewsets, serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import Library, LibraryBook, LibraryReservation
from apps.users.models import User


class LibrarySerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Library
        fields = '__all__'
        read_only_fields = ['id', 'is_verified', 'created_at']


class LibraryBookSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = LibraryBook
        fields = '__all__'
        read_only_fields = ['id', 'available_copies', 'created_at']


class LibraryReservationSerializer(drf_serializers.ModelSerializer):
    library_book = LibraryBookSerializer(read_only=True)

    class Meta:
        model = LibraryReservation
        fields = '__all__'
        read_only_fields = ['id', 'student', 'reserved_at', 'status']


class LibraryViewSet(viewsets.ModelViewSet):
    queryset = Library.objects.filter(is_verified=True)
    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LibraryBookViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LibraryBook.objects.filter(status='available')
    serializer_class = LibraryBookSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['subject', 'library', 'status']
    search_fields = ['title', 'author', 'isbn']


class LibraryReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LibraryReservationSerializer

    def get_queryset(self):
        return LibraryReservation.objects.filter(
            student=self.request.user
        ).select_related('library_book__library').order_by('-reserved_at')

    def create(self, request, *args, **kwargs):
        book_id = request.data.get('library_book_id')
        try:
            book = LibraryBook.objects.get(id=book_id, available_copies__gt=0)
        except LibraryBook.DoesNotExist:
            return Response({'error': 'Book not available.'}, status=400)

        # Prevent duplicate reservation
        if LibraryReservation.objects.filter(
            student=request.user,
            library_book=book,
            status__in=['pending', 'confirmed', 'ready']
        ).exists():
            return Response({'error': 'You already have a reservation for this book.'}, status=400)

        reservation = LibraryReservation.objects.create(
            library_book=book,
            student=request.user,
            pickup_by=timezone.now().date() + timedelta(days=3),
            notes=request.data.get('notes', '')
        )
        LibraryBook.objects.filter(id=book.id).update(
            available_copies=book.available_copies - 1
        )
        return Response(LibraryReservationSerializer(reservation).data, status=201)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status not in ['pending', 'confirmed']:
            return Response({'error': 'Cannot cancel this reservation.'}, status=400)
        reservation.status = 'cancelled'
        reservation.save(update_fields=['status'])
        LibraryBook.objects.filter(id=reservation.library_book_id).update(
            available_copies=LibraryBook.objects.get(id=reservation.library_book_id).available_copies + 1
        )
        return Response({'message': 'Reservation cancelled.'})
