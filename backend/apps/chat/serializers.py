"""Chat serializers"""
from rest_framework import serializers
from .models import ChatRoom, Message
from apps.users.serializers import UserPublicSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'room', 'sender', 'content', 'message_type',
            'status', 'file_url', 'file_name', 'file_size', 'file_type',
            'reply_to', 'is_read', 'read_at', 'is_deleted',
            'created_at', 'is_edited', 'edited_at'
        ]
        read_only_fields = ['id', 'sender', 'status', 'is_read', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserPublicSerializer(many=True, read_only=True)
    other_user = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    book_title = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'participants', 'other_user', 'book', 'book_title',
            'last_message_at', 'last_message_preview',
            'unread_count', 'created_at'
        ]

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request:
            other = obj.get_other_participant(request.user)
            if other:
                return UserPublicSerializer(other, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.unread_count_for(request.user)
        return 0

    def get_book_title(self, obj):
        return obj.book.title if obj.book else None
