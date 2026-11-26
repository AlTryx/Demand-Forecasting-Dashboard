from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.models import AbstractUser
from core.models import TimeStampedModel


class User(AbstractUser, TimeStampedModel):
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
    active_business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    oidc_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
    currency = models.CharField(max_length=3, choices=[("EUR", "EUR"), ("USD", "USD")], default="EUR")
    horizon_days = models.PositiveSmallIntegerField(choices=[(7, "7 days"), (14, "14 days"), (30, "30 days")], default=30)
    stockout_alerts = models.BooleanField(default=True)
    weekly_digest = models.BooleanField(default=False)
    live_stream = models.BooleanField(default=True)

    USERNAME_FIELD = "username"
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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'business'], name='unique_user_business')
        ]