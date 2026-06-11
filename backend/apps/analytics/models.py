from django.db import models
from core.models import TimeStampedModel

class EvaluationMetric(TimeStampedModel):
    class ForecastStatus(models.TextChoices):
        ACCURATE = "ACCURATE", "Accurate"
        OVER_FORECASTED = "OVER_FORECASTED", "Over Forecasted (Risk of Overstock)"
        UNDER_FORECASTED = "UNDER_FORECASTED", "Under Forecasted (Risk of Stockout)"
        
    forecast_result = models.ForeignKey('forecasting.ForecastResult', on_delete=models.CASCADE)
    actual_quantity_sold = models.IntegerField()
    absolute_error = models.DecimalField(max_digits=5, decimal_places=2)
    percentage_error = models.DecimalField(max_digits=5, decimal_places=2)
    bias = models.IntegerField()
    status = models.CharField(max_length=30, choices=ForecastStatus.choices, default=ForecastStatus.ACCURATE)
