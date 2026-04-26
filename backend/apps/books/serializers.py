"""Book serializers"""
from rest_framework import serializers
from .models import Book, BookImage, Tag, BookReport
from apps.users.serializers import UserPublicSerializer


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class BookImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BookImage
        fields = ['id', 'image_url', 'is_cover', 'order']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/map views"""
    owner = UserPublicSerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'subject', 'material_type',
            'availability_type', 'condition', 'status',
            'latitude', 'longitude', 'city',
            'cover_image', 'owner', 'is_saved',
            'view_count', 'save_count', 'created_at',
        ]

    def get_cover_image(self, obj):
        request = self.context.get('request')
        img = obj.images.filter(is_cover=True).first() or obj.images.first()
        if img and request:
            return request.build_absolute_uri(img.image.url)
        return None

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False


class BookSerializer(serializers.ModelSerializer):
    """Full book detail serializer"""
    owner = UserPublicSerializer(read_only=True)
    images = BookImageSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    is_saved = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'owner', 'title', 'author', 'isbn', 'publisher',
            'publication_year', 'edition', 'description', 'language',
            'material_type', 'subject', 'subjects', 'grade_level',
            'availability_type', 'condition', 'status', 'max_borrow_days',
            'is_free', 'latitude', 'longitude', 'address', 'city',
            'pickup_instructions', 'digital_only',
            'tags', 'images', 'view_count', 'save_count',
            'is_saved', 'qr_code_url', 'created_at', 'updated_at',
        ]

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False

    def get_qr_code_url(self, obj):
        request = self.context.get('request')
        if obj.qr_code and request:
            return request.build_absolute_uri(obj.qr_code.url)
        return None


class BookCreateSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(child=serializers.CharField(max_length=50), required=False, write_only=True)
    images = serializers.ListField(
        child=serializers.ImageField(), required=False, write_only=True
    )

    class Meta:
        model = Book
        fields = [
            'title', 'author', 'isbn', 'publisher', 'publication_year',
            'edition', 'description', 'language', 'material_type',
            'subject', 'subjects', 'grade_level', 'availability_type',
            'condition', 'max_borrow_days', 'is_free',
            'latitude', 'longitude', 'address', 'city', 'pickup_instructions',
            'digital_only', 'pdf_file', 'tag_names', 'images',
        ]

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        images = validated_data.pop('images', [])
        book = Book.objects.create(**validated_data)

        # Handle tags
        for name in tag_names[:10]:
            from django.utils.text import slugify
            tag, _ = Tag.objects.get_or_create(
                slug=slugify(name),
                defaults={'name': name}
            )
            Tag.objects.filter(id=tag.id).update(usage_count=tag.usage_count + 1)
            book.tags.add(tag)

        # Handle images
        for i, img in enumerate(images[:5]):
            BookImage.objects.create(
                book=book, image=img, is_cover=(i == 0), order=i
            )

        return book


class BookReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookReport
        fields = ['id', 'reason', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']
