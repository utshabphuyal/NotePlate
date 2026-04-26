"""NotePlate URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
SpectacularSwaggerUIView = SpectacularSwaggerView

api_v1 = [
    path('auth/', include('apps.users.urls.auth')),
    path('users/', include('apps.users.urls.users')),
    path('books/', include('apps.books.urls')),
    path('chat/', include('apps.chat.urls')),
    path('borrowing/', include('apps.borrowing.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('library/', include('apps.library.urls')),
    path('admin-panel/', include('apps.admin_panel.urls')),
]

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/v1/', include(api_v1)),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
