from django.db import models
from core.models import TimeStampedModel

class Inventory(TimeStampedModel):
    class InventoryStatus(models.TextChoices):
        OK = "OK", "Ok"
        OVERSTOCK = "OVERSTOCK", "Overstock"
        STOCKOUT_RISK = "STOCKOUT_RISK", "STOCKOUT_RISK"
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    days_of_stock_left = models.IntegerField()
    status = models.CharField(max_length=20, choices=InventoryStatus.choices, default=InventoryStatus.OK)

    #KPIs
    recommended_reorder_quantity = models.IntegerField(default=0)
