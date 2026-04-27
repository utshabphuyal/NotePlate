"""User profile views"""
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.users.models import BlockedUser, UserReport, UserRating
from apps.users.serializers import (
    UserProfileSerializer, UserPublicSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, UserRatingSerializer, UserReportSerializer
)
from utils.permissions import IsOwnerOrReadOnly

User = get_user_model()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True, is_banned=False)
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        return UserPublicSerializer

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get or update current user's profile"""
        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user, context={'request': request})
            return Response(serializer.data)

        serializer = UpdateProfileSerializer(
            request.user, data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user, context={'request': request}).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def upload_avatar(self, request):
        """Upload profile picture"""
        avatar = request.FILES.get('avatar')
        if not avatar:
            return Response({'error': 'No image provided.'}, status=400)
        if avatar.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            return Response({'error': 'Invalid image type. Use JPEG, PNG, or WebP.'}, status=400)
        if avatar.size > 5 * 1024 * 1024:
            return Response({'error': 'Image too large. Max 5MB.'}, status=400)

        import cloudinary.uploader
        result = cloudinary.uploader.upload(
    avatar,
    folder='noteplate/avatars',
    public_id=str(request.user.id),
    overwrite=True,
    transformation=[{'width': 400, 'height': 400, 'crop': 'fill'}]
)
        request.user.avatar_cloudinary_url = result['secure_url']
        request.user.save(update_fields=['avatar_cloudinary_url'])
        return Response({'avatar_url': result['secure_url']})
        

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully.'})

    @action(detail=True, methods=['get'])
    def ratings(self, request, pk=None):
        """Get ratings for a user"""
        user = self.get_object()
        ratings = UserRating.objects.filter(reviewed=user).select_related('reviewer').order_by('-created_at')
        serializer = UserRatingSerializer(ratings, many=True, context={'request': request})
        return Response({'results': serializer.data, 'average': user.average_rating, 'count': user.rating_count})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rate(self, request, pk=None):
        """Rate a user after a borrow transaction"""
        reviewed = self.get_object()
        if reviewed == request.user:
            return Response({'error': 'Cannot rate yourself.'}, status=400)

        borrow_id = request.data.get('borrow_request_id')
        from apps.borrowing.models import BorrowRequest
        try:
            borrow = BorrowRequest.objects.get(
                id=borrow_id,
                status='returned'
            )
        except BorrowRequest.DoesNotExist:
            return Response({'error': 'Valid completed borrow request required.'}, status=400)

        if request.user not in [borrow.borrower, borrow.lender]:
            return Response({'error': 'You were not part of this transaction.'}, status=403)

        if UserRating.objects.filter(reviewer=request.user, borrow_request=borrow).exists():
            return Response({'error': 'Already rated this transaction.'}, status=400)

        serializer = UserRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewer=request.user, reviewed=reviewed, borrow_request=borrow)

        from apps.notifications.models import Notification
        Notification.objects.create(
            user=reviewed,
            notification_type='rating_received',
            title=f'{request.user.full_name} rated you',
            body=f'You received a {serializer.validated_data["rating"]}-star rating.',
            data={'reviewer_id': str(request.user.id)}
        )
        return Response({'message': 'Rating submitted.'}, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def block(self, request, pk=None):
        """Block/unblock a user"""
        target = self.get_object()
        if target == request.user:
            return Response({'error': 'Cannot block yourself.'}, status=400)
        block, created = BlockedUser.objects.get_or_create(blocker=request.user, blocked=target)
        if not created:
            block.delete()
            return Response({'blocked': False, 'message': f'{target.username} unblocked.'})
        return Response({'blocked': True, 'message': f'{target.username} blocked.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def report(self, request, pk=None):
        """Report a user"""
        reported = self.get_object()
        serializer = UserReportSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user, reported=reported)
        return Response({'message': 'Report submitted successfully.'}, status=201)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def blocked_users(self, request):
        """Get list of users blocked by current user"""
        blocked = User.objects.filter(blocked_by__blocker=request.user)
        serializer = UserPublicSerializer(blocked, many=True, context={'request': request})
        return Response({'results': serializer.data})
