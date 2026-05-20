from django.db import models
from core.models import TimeStampedModel

class ForecastResult(TimeStampedModel):
    class HorizonOptions(models.IntegerChoices):
        ONE_WEEK = 7, "7 DAYS"
        ONE_MONTH = 30, "30 DAYS"
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    predicted_quantity = models.IntegerField()
    horizon = models.IntegerField(choices=HorizonOptions)
    confidence_score = models.DecimalField(max_digits=7, decimal_places=4)
    generated_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["product", "-generated_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(predicted_quantity__gte=0),
                name="forecast_result_predicted_quantity_gte_0"
            )
        ]
        ordering = ["-generated_at"]