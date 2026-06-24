from django.db.models import F, Case, When, Value, CharField, OuterRef, Subquery
from .models import Inventory
from forecasting.models import ForecastResult

class InventoryService:
    @staticmethod
    def get_annotated_inventory(business):
        latest_forecast_subquery = ForecastResult.objects.filter(
            product = OuterRef('product'),
        )