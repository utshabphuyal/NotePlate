"""Admin panel URLs"""
from django.urls import path
from .views import analytics, list_users, ban_user, unban_user, remove_book, user_reports_list, resolve_report

urlpatterns = [
    path('analytics/', analytics, name='admin_analytics'),
    path('users/', list_users, name='admin_users'),
    path('users/<uuid:user_id>/ban/', ban_user, name='admin_ban_user'),
    path('users/<uuid:user_id>/unban/', unban_user, name='admin_unban_user'),
    path('books/<uuid:book_id>/remove/', remove_book, name='admin_remove_book'),
    path('reports/', user_reports_list, name='admin_reports'),
    path('reports/<uuid:report_id>/resolve/', resolve_report, name='admin_resolve_report'),
]
