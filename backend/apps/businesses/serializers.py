from rest_framework import serializers
from apps.users.models import BusinessUser
from .models import Business


class BusinessMeSerializer(serializers.ModelSerializer):
    """Returns the active business for the authenticated user."""

    id = serializers.IntegerField(source="business.id")
    name = serializers.CharField(source="business.name")
    created_at = serializers.DateTimeField(source="business.created_at")
    current_user_role = serializers.CharField(source="role")
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessUser
        fields = ["id", "name", "created_at", "current_user_role", "owner_name"]

    def get_owner_name(self, obj: BusinessUser) -> str | None:
        owner_bu = obj.business.owner
        if owner_bu and owner_bu.user:
            u = owner_bu.user
            full_name = f"{u.first_name} {u.last_name}".strip()
            return full_name or u.username
        return None


class BusinessListSerializer(serializers.ModelSerializer):
    """One entry per business the authenticated user is a member of."""

    id = serializers.IntegerField(source="business.id")
    name = serializers.CharField(source="business.name")
    created_at = serializers.DateTimeField(source="business.created_at")
    role = serializers.CharField()
    is_active = serializers.BooleanField()

    class Meta:
        model = BusinessUser
        fields = ["id", "name", "role", "is_active", "created_at"]


class BusinessCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30)
