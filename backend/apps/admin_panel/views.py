"""
NotePlate Admin Panel Views
Analytics, user management, content moderation
"""
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import User, UserReport
from apps.books.models import Book, BookReport
from apps.borrowing.models import BorrowRequest
from apps.notifications.models import Notification
from utils.permissions import IsAdminUser


class AdminDashboardView:
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics(request):
    """Dashboard analytics"""
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    total_users = User.objects.count()
    new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()
    new_users_7d = User.objects.filter(created_at__gte=seven_days_ago).count()
    users_by_role = list(User.objects.values('role').annotate(count=Count('id')))

    total_books = Book.objects.count()
    active_books = Book.objects.filter(status='active').count()
    books_by_type = list(Book.objects.values('material_type').annotate(count=Count('id')))
    books_by_availability = list(Book.objects.values('availability_type').annotate(count=Count('id')))

    total_borrows = BorrowRequest.objects.count()
    active_borrows = BorrowRequest.objects.filter(status='active').count()
    completed_borrows = BorrowRequest.objects.filter(status='returned').count()
    overdue_borrows = BorrowRequest.objects.filter(status='overdue').count()
    borrows_30d = BorrowRequest.objects.filter(requested_at__gte=thirty_days_ago).count()

    pending_reports = UserReport.objects.filter(status='pending').count()
    pending_book_reports = BookReport.objects.filter(status='pending').count()

    # Top cities
    top_cities = list(
        Book.objects.exclude(city='').values('city').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
    )

    # Daily new users (last 7 days)
    daily_users = []
    for i in range(7):
        day = now - timedelta(days=i)
        count = User.objects.filter(
            created_at__date=day.date()
        ).count()
        daily_users.append({'date': day.date().isoformat(), 'count': count})

    return Response({
        'users': {
            'total': total_users,
            'new_30d': new_users_30d,
            'new_7d': new_users_7d,
            'by_role': users_by_role,
            'daily_last_7d': daily_users,
        },
        'books': {
            'total': total_books,
            'active': active_books,
            'by_type': books_by_type,
            'by_availability': books_by_availability,
            'top_cities': top_cities,
        },
        'borrowing': {
            'total': total_borrows,
            'active': active_borrows,
            'completed': completed_borrows,
            'overdue': overdue_borrows,
            'last_30d': borrows_30d,
        },
        'moderation': {
            'pending_user_reports': pending_reports,
            'pending_book_reports': pending_book_reports,
            'total_pending': pending_reports + pending_book_reports,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_users(request):
    qs = User.objects.all().order_by('-created_at')
    search = request.query_params.get('search', '')
    if search:
        qs = qs.filter(Q(email__icontains=search) | Q(username__icontains=search) | Q(full_name__icontains=search))
    role = request.query_params.get('role')
    if role:
        qs = qs.filter(role=role)
    is_banned = request.query_params.get('is_banned')
    if is_banned is not None:
        qs = qs.filter(is_banned=is_banned == 'true')

    from utils.pagination import StandardResultsPagination
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(qs, request)
    data = [{
        'id': str(u.id), 'email': u.email, 'username': u.username,
        'full_name': u.full_name, 'role': u.role, 'is_active': u.is_active,
        'is_banned': u.is_banned, 'reputation_score': u.reputation_score,
        'total_lent': u.total_lent, 'total_borrowed': u.total_borrowed,
        'created_at': u.created_at.isoformat(),
    } for u in page]
    return paginator.get_paginated_response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def ban_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
    if user.is_admin_user:
        return Response({'error': 'Cannot ban admin users.'}, status=403)

    reason = request.data.get('reason', '')
    duration_days = request.data.get('duration_days')

    user.is_banned = True
    user.is_active = False
    user.ban_reason = reason
    if duration_days:
        user.ban_expires_at = timezone.now() + timedelta(days=int(duration_days))
    user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'ban_expires_at'])

    Notification.objects.create(
        user=user,
        notification_type='system',
        title='Account suspended',
        body=f'Your account has been suspended. Reason: {reason}',
        data={}
    )
    return Response({'message': f'User {user.username} has been banned.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def unban_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
    user.is_banned = False
    user.is_active = True
    user.ban_reason = ''
    user.ban_expires_at = None
    user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'ban_expires_at'])
    return Response({'message': f'User {user.username} has been unbanned.'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def remove_book(request, book_id):
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found.'}, status=404)
    reason = request.data.get('reason', '')
    book.status = 'removed'
    book.admin_notes = reason
    book.removed_by = request.user
    book.save(update_fields=['status', 'admin_notes', 'removed_by'])

    Notification.objects.create(
        user=book.owner,
        notification_type='system',
        title='Your listing was removed',
        body=f'"{book.title}" was removed by admin. Reason: {reason}',
        data={'book_id': str(book.id)}
    )
    return Response({'message': 'Book listing removed.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def user_reports_list(request):
    qs = UserReport.objects.all().select_related('reporter', 'reported').order_by('-created_at')
    status_filter = request.query_params.get('status', 'pending')
    if status_filter:
        qs = qs.filter(status=status_filter)
    data = [{
        'id': str(r.id),
        'reporter': {'id': str(r.reporter.id), 'username': r.reporter.username},
        'reported': {'id': str(r.reported.id), 'username': r.reported.username},
        'reason': r.reason,
        'description': r.description,
        'status': r.status,
        'created_at': r.created_at.isoformat(),
    } for r in qs[:50]]
    return Response({'results': data, 'count': len(data)})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def resolve_report(request, report_id):
    try:
        report = UserReport.objects.get(id=report_id)
    except UserReport.DoesNotExist:
        return Response({'error': 'Report not found.'}, status=404)
    action_taken = request.data.get('action', 'dismissed')  # 'resolved' or 'dismissed'
    report.status = action_taken
    report.admin_notes = request.data.get('notes', '')
    report.resolved_by = request.user
    report.save(update_fields=['status', 'admin_notes', 'resolved_by'])
    return Response({'message': f'Report marked as {action_taken}.'})
