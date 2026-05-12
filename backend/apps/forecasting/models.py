from django.db import models
from core.models import TimeStampedModel

class ForecastResult(TimeStampedModel):
    class HorizonOptions(models.TextChoices):
        ONE_WEEK = "7 days", "7 DAYS"
        ONE_MONTH = "30 days", "30 DAYS"
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    predicted_quantity = models.IntegerField()
    horizon = models.CharField(max_length=10, choices=HorizonOptions)
    confidence_score = models.DecimalField(max_digits=7, decimal_places=4)