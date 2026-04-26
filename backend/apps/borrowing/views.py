"""
Borrowing Views - Full borrow lifecycle management
"""
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BorrowRequest
from .serializers import BorrowRequestSerializer, BorrowRequestCreateSerializer
from apps.books.models import Book
from apps.notifications.models import Notification
from utils.permissions import IsLenderOrBorrower


class BorrowRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BorrowRequestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = BorrowRequest.objects.filter(
            models.Q(borrower=user) | models.Q(lender=user)
        ).select_related('book', 'borrower', 'lender', 'book__owner')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        role = self.request.query_params.get('role')
        if role == 'borrower':
            queryset = queryset.filter(borrower=user)
        elif role == 'lender':
            queryset = queryset.filter(lender=user)
        
        return queryset.order_by('-requested_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return BorrowRequestCreateSerializer
        return BorrowRequestSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a borrow request"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        book_id = serializer.validated_data['book_id']
        try:
            book = Book.objects.select_for_update().get(id=book_id, status='active')
        except Book.DoesNotExist:
            return Response({'error': 'Book not found or unavailable.'}, status=400)

        if book.owner == request.user:
            return Response({'error': 'You cannot borrow your own book.'}, status=400)

        if book.availability_type == 'donate':
            return Response({'error': 'This book is only available for donation.'}, status=400)

        # Check active borrows limit
        active_count = BorrowRequest.objects.filter(
            borrower=request.user,
            status__in=['pending', 'accepted', 'active']
        ).count()
        max_borrows = getattr(settings, 'MAX_ACTIVE_BORROWS_PER_USER', 5)
        if active_count >= max_borrows:
            return Response(
                {'error': f'You have reached the maximum of {max_borrows} active borrows.'},
                status=400
            )

        # Check for duplicate request
        existing = BorrowRequest.objects.filter(
            book=book,
            borrower=request.user,
            status__in=['pending', 'accepted', 'active']
        ).exists()
        if existing:
            return Response({'error': 'You already have an active request for this book.'}, status=400)

        borrow = BorrowRequest.objects.create(
            book=book,
            borrower=request.user,
            lender=book.owner,
            requested_duration_days=serializer.validated_data.get('requested_duration_days', 14),
            borrower_note=serializer.validated_data.get('borrower_note', ''),
        )

        # Notify lender
        Notification.objects.create(
            user=book.owner,
            notification_type='borrow_request',
            title=f'{request.user.full_name} wants to borrow your book',
            body=f'"{book.title}" - {borrow.borrower_note[:100] if borrow.borrower_note else "No note"}',
            data={'borrow_request_id': str(borrow.id), 'book_id': str(book.id)}
        )

        return Response(BorrowRequestSerializer(borrow, context={'request': request}).data,
                       status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept(self, request, pk=None):
        """Lender accepts a borrow request"""
        borrow = self.get_object()

        if borrow.lender != request.user:
            return Response({'error': 'Only the lender can accept requests.'}, status=403)
        if borrow.status != BorrowRequest.Status.PENDING:
            return Response({'error': 'Request is not in pending status.'}, status=400)

        borrow.status = BorrowRequest.Status.ACCEPTED
        borrow.accepted_at = timezone.now()
        borrow.generate_handover_code()  # For physical handover verification

        # Reserve the book
        Book.objects.filter(id=borrow.book_id).update(status='reserved')

        Notification.objects.create(
            user=borrow.borrower,
            notification_type='request_accepted',
            title='Borrow request accepted! 🎉',
            body=f'Your request for "{borrow.book.title}" was accepted. Handover code: {borrow.handover_code}',
            data={
                'borrow_request_id': str(borrow.id),
                'handover_code': borrow.handover_code,
            }
        )
        return Response(BorrowRequestSerializer(borrow, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Lender rejects a borrow request"""
        borrow = self.get_object()
        if borrow.lender != request.user:
            return Response({'error': 'Only the lender can reject requests.'}, status=403)
        if borrow.status not in [BorrowRequest.Status.PENDING, BorrowRequest.Status.ACCEPTED]:
            return Response({'error': 'Cannot reject this request.'}, status=400)

        borrow.status = BorrowRequest.Status.REJECTED
        borrow.rejected_at = timezone.now()
        borrow.rejection_reason = request.data.get('reason', '')
        borrow.save(update_fields=['status', 'rejected_at', 'rejection_reason'])

        # Reactivate book if it was reserved
        Book.objects.filter(id=borrow.book_id, status='reserved').update(status='active')

        Notification.objects.create(
            user=borrow.borrower,
            notification_type='request_rejected',
            title='Borrow request declined',
            body=f'Your request for "{borrow.book.title}" was declined.' +
                 (f' Reason: {borrow.rejection_reason}' if borrow.rejection_reason else ''),
            data={'borrow_request_id': str(borrow.id)}
        )
        return Response({'message': 'Request rejected.'})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def confirm_handover(self, request, pk=None):
        """Borrower confirms receiving the book (with handover code)"""
        borrow = self.get_object()
        if borrow.borrower != request.user:
            return Response({'error': 'Only the borrower can confirm handover.'}, status=403)
        if borrow.status != BorrowRequest.Status.ACCEPTED:
            return Response({'error': 'Request must be accepted first.'}, status=400)

        code = request.data.get('handover_code', '').strip().upper()
        if code != borrow.handover_code:
            return Response({'error': 'Invalid handover code.'}, status=400)

        due_date = timezone.now().date() + timedelta(days=borrow.requested_duration_days)
        borrow.status = BorrowRequest.Status.ACTIVE
        borrow.handed_over_at = timezone.now()
        borrow.due_date = due_date
        borrow.generate_return_code()
        borrow.save(update_fields=['status', 'handed_over_at', 'due_date', 'return_code'])

        Book.objects.filter(id=borrow.book_id).update(status='borrowed')

        # Update lender stats
        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.filter(id=borrow.lender_id).update(
            total_lent=models.F('total_lent') + 1
        )

        Notification.objects.create(
            user=borrow.lender,
            notification_type='book_handed_over',
            title='Book handover confirmed',
            body=f'"{borrow.book.title}" handed to {borrow.borrower.full_name}. Due: {due_date}',
            data={'borrow_request_id': str(borrow.id)}
        )
        return Response({
            'message': 'Handover confirmed.',
            'due_date': str(due_date),
            'return_code': borrow.return_code,
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def confirm_return(self, request, pk=None):
        """Lender confirms book was returned (with return code)"""
        borrow = self.get_object()
        if borrow.lender != request.user:
            return Response({'error': 'Only the lender can confirm return.'}, status=403)
        if borrow.status not in [BorrowRequest.Status.ACTIVE, BorrowRequest.Status.OVERDUE]:
            return Response({'error': 'Book must be active/overdue to confirm return.'}, status=400)

        code = request.data.get('return_code', '').strip().upper()
        if code != borrow.return_code:
            return Response({'error': 'Invalid return code.'}, status=400)

        borrow.status = BorrowRequest.Status.RETURNED
        borrow.returned_at = timezone.now()
        actual_days = (timezone.now().date() - borrow.handed_over_at.date()).days
        borrow.actual_duration_days = actual_days
        borrow.save(update_fields=['status', 'returned_at', 'actual_duration_days'])

        Book.objects.filter(id=borrow.book_id).update(status='active')

        # Update stats and reputation
        from django.contrib.auth import get_user_model
        from django.conf import settings
        User = get_user_model()

        User.objects.filter(id=borrow.borrower_id).update(
            total_borrowed=models.F('total_borrowed') + 1
        )

        weights = getattr(settings, 'REPUTATION_WEIGHTS', {})
        if not borrow.is_overdue:
            borrow.lender.update_reputation(weights.get('successful_lend', 10))
            borrow.borrower.update_reputation(weights.get('successful_borrow', 5))
        else:
            borrow.borrower.update_reputation(weights.get('late_return', -10))

        Notification.objects.create(
            user=borrow.borrower,
            notification_type='return_confirmed',
            title='Return confirmed! Please rate your experience',
            body=f'"{borrow.book.title}" has been returned. Rate {borrow.lender.full_name}!',
            data={'borrow_request_id': str(borrow.id), 'rate_user_id': str(borrow.lender_id)}
        )
        return Response({'message': 'Return confirmed. Please rate your experience!'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Borrower cancels their pending request"""
        borrow = self.get_object()
        if borrow.borrower != request.user:
            return Response({'error': 'Only the borrower can cancel.'}, status=403)
        if borrow.status not in [BorrowRequest.Status.PENDING]:
            return Response({'error': 'Only pending requests can be cancelled.'}, status=400)

        borrow.status = BorrowRequest.Status.CANCELLED
        borrow.save(update_fields=['status'])

        Book.objects.filter(id=borrow.book_id, status='reserved').update(status='active')

        return Response({'message': 'Request cancelled.'})

    @action(detail=True, methods=['post'])
    def request_extension(self, request, pk=None):
        """Borrower requests extension"""
        borrow = self.get_object()
        if borrow.borrower != request.user:
            return Response({'error': 'Permission denied.'}, status=403)
        if borrow.status != BorrowRequest.Status.ACTIVE:
            return Response({'error': 'Can only extend active borrows.'}, status=400)
        if borrow.extension_requested:
            return Response({'error': 'Extension already requested.'}, status=400)

        extra_days = int(request.data.get('extra_days', 7))
        max_ext = getattr(settings, 'MAX_BORROW_EXTENSION_DAYS', 7)
        extra_days = min(extra_days, max_ext)

        borrow.extension_requested = True
        borrow.extension_days = extra_days
        borrow.save(update_fields=['extension_requested', 'extension_days'])

        Notification.objects.create(
            user=borrow.lender,
            notification_type='extension_request',
            title=f'{borrow.borrower.full_name} requested an extension',
            body=f'{extra_days} more days for "{borrow.book.title}"',
            data={'borrow_request_id': str(borrow.id), 'extra_days': extra_days}
        )
        return Response({'message': f'Extension request for {extra_days} days sent.'})


# Need to import models for F()
from django.db import models
