from django.db import models
from core.models import TimeStampedModel

class ForecastResult(TimeStampedModel):
    class HorizonOptions(models.IntegerChoices):
        ONE_WEEK = 7, "7 DAYS"
        ONE_MONTH = 30, "30 DAYS"

    class Methods(models.TextChoices):
        LIGHTGBM = "lightgbm", "LightGBM model"
        LAST_WEEK = "last_week", "Same as last week"
        NAIVE = "naive", "Recent average"

    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    predicted_quantity = models.IntegerField()
    lower_bound = models.IntegerField(null=True, blank=True)
    upper_bound = models.IntegerField(null=True, blank=True)
    horizon = models.IntegerField(choices=HorizonOptions)
    confidence_score = models.DecimalField(max_digits=7, decimal_places=4)
    generated_at = models.DateTimeField(auto_now_add=True)
    week_start = models.DateField(null=True, blank=True)
    method = models.CharField(max_length=20, choices=Methods.choices, default=Methods.LIGHTGBM)
    class Meta:
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["product", "-generated_at"]),
            models.Index(fields=["week_start", "product"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(predicted_quantity__gte=0),
                name="forecast_result_predicted_quantity_gte_0"
            ),
            models.UniqueConstraint(
                fields=["product", "week_start"],
                name="forecast_result_one_per_product_week",
            ),
        ]
        ordering = ["-generated_at"]