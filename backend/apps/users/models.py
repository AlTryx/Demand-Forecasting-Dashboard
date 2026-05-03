from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.models import AbstractUser
from ...core.models import TimeStampedModel


class CustomUser(AbstractUser, TimeStampedModel):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        max_length=30,
        unique=True,
        help_text="Required. 30 characters or fewer. Letters, digits and @/./+/-/_ only.",
        validators=[username_validator],
        error_messages={
            "unique": "A user with that username already exists.",
        },
    )
    email = models.EmailField(unique=True, blank=False)
    first_name = models.CharField(max_length=30, blank=False)
    last_name = models.CharField(max_length=30, blank=False)
    oidc_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # This tells Django which fields to ask for when running 'python manage.py createsuperuser'. 'username' and 'password' are required by default.
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    def __str__(self):
        return self.username

class BusinessUser(TimeStampedModel):
    class Roles(models.TextChoices):
        MANAGER = "manager", "Manager"
        OWNER = "owner", "Owner"
        EMPLOYEE = "employee", "Employee"

    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE)
    role = models.CharField(max_length=30, choices=Roles.choices, default=Roles.EMPLOYEE)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'business'], name='unique_user_business')
        ]