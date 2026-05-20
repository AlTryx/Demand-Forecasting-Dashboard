from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..services import UserService

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {"password": {"write_only": True}}

    def validate_password(self, value):
        UserService.validate_password(value)
        return value

    def create(self, validated_data):
        return UserService.create(validated_data)

