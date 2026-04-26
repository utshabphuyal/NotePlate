"""Book filters using django-filter"""
import django_filters
from .models import Book


class BookFilter(django_filters.FilterSet):
    subject = django_filters.CharFilter(field_name='subject', lookup_expr='icontains')
    city = django_filters.CharFilter(field_name='city', lookup_expr='icontains')
    availability_type = django_filters.ChoiceFilter(choices=Book.AvailabilityType.choices)
    material_type = django_filters.ChoiceFilter(choices=Book.MaterialType.choices)
    condition = django_filters.ChoiceFilter(choices=Book.Condition.choices)
    is_free = django_filters.BooleanFilter()
    digital_only = django_filters.BooleanFilter()
    min_year = django_filters.NumberFilter(field_name='publication_year', lookup_expr='gte')
    max_year = django_filters.NumberFilter(field_name='publication_year', lookup_expr='lte')

    class Meta:
        model = Book
        fields = ['subject', 'city', 'availability_type', 'material_type', 'condition', 'is_free', 'digital_only']
