from django.db import models
from core.models import TimeStampedModel

class Business(TimeStampedModel):
    name = models.CharField(max_length=30, blank=False)
    owner = models.ForeignKey('users.BusinessUser', on_delete=models.CASCADE, related_name='owned_businesses')