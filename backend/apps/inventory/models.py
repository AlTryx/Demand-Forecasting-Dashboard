from django.db import models
from apps.forecasting.models import ForecastResult
from core.models import TimeStampedModel

class Inventory(TimeStampedModel):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    days_of_stock_left = models.IntegerField()
    #KPIs
    recommended_reorder_quantity = models.IntegerField(default=0) #difference between predicted_quantity - quantity
    @property
    def status(self):
        latest_forecast = ForecastResult.objects.filter(product=self.product).order_by('-created_at').first()
        if not latest_forecast:
            return "UNKNOWN"
        if self.product.current_stock < latest_forecast.predicted_quantity:
            return "STOCKOUT_RISK"
        if self.days_of_stock_left > 60:
            return "OVERSTOCK"
        return "OK"
