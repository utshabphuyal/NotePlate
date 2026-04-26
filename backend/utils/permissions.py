"""
NotePlate Utility: Custom Permissions
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """Allow read to all, write only to owner."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, 'owner', None) or getattr(obj, 'user', None)
        return owner == request.user


class IsAdminUser(BasePermission):
    """Only admin role users."""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                request.user.role == 'admin')


class IsLenderOrBorrower(BasePermission):
    """Only lender or borrower of a borrow request."""
    def has_object_permission(self, request, view, obj):
        return obj.lender == request.user or obj.borrower == request.user


class IsNotBanned(BasePermission):
    """Reject banned users."""
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return not request.user.is_banned
        return True
