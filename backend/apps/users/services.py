from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import re

class UserService:
    @staticmethod
    def get_user(user_id):
        user = get_user_model()
        try:
            return user.objects.get(id=user_id)
        except user.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error fetching user {user_id}: {e}")
            return None

    @staticmethod
    def validate_password(password: str):
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", password):
            raise ValidationError("Password must include a capital letter")
        if not re.search(r"[0-9]", password):
            raise ValidationError("Password must include a number")
        if not re.search(r"[!@#$%^&*()_+=-]", password):
            raise ValidationError("Password must include a special character")

    @staticmethod
    def create(validated_data):
        password = validated_data["password"]
        UserService.validate_password(password)
        user = User.objects.create(
            username=validated_data["username"],
            password=password,
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"]
        )
        user.save()
        return user

