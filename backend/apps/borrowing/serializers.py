"""Borrow request serializers"""
from rest_framework import serializers
from .models import BorrowRequest
from apps.books.serializers import BookListSerializer
from apps.users.serializers import UserPublicSerializer


class BorrowRequestSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    borrower = UserPublicSerializer(read_only=True)
    lender = UserPublicSerializer(read_only=True)

    class Meta:
        model = BorrowRequest
        fields = [
            'id', 'book', 'borrower', 'lender', 'status',
            'requested_at', 'accepted_at', 'rejected_at',
            'handed_over_at', 'due_date', 'returned_at',
            'requested_duration_days', 'actual_duration_days',
            'borrower_note', 'rejection_reason',
            'handover_code', 'return_code',
            'extension_requested', 'extension_days', 'extension_approved',
            'is_overdue', 'overdue_days', 'updated_at',
        ]
        read_only_fields = [
            'id', 'borrower', 'lender', 'status',
            'requested_at', 'accepted_at', 'rejected_at',
            'handed_over_at', 'due_date', 'returned_at',
            'actual_duration_days', 'handover_code', 'return_code',
            'is_overdue', 'overdue_days',
        ]


class BorrowRequestCreateSerializer(serializers.Serializer):
    book_id = serializers.UUIDField()
    requested_duration_days = serializers.IntegerField(min_value=1, max_value=90, default=14)
    borrower_note = serializers.CharField(max_length=500, required=False, allow_blank=True)
