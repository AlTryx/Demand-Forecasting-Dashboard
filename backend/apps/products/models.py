from django.db import models
from core.models import TimeStampedModel

class Product(TimeStampedModel):
    name = models.CharField(max_length=20, blank=False)
    category = models.CharField(max_length=20, blank=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    current_stock = models.IntegerField()
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE)
    stock_keeping_unit = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(current_stock__gte=0),
                name='current_stock_gte_0'
            ),
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name='price_gte_0'
            )
        ]

class StockLog(models.Model):
    class ChangeReasons(models.TextChoices):
        SALE = "SALE", "Customer Purchase"
        RESTOCK = "RESTOCK", "Supplier Delivery"
        WASTE = "WASTE", "Damaged / Expired Goods"
        CORRECTION = "CORRECTION", "Manual Inventory Count Audit"

    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='stock_logs')
    quantity_changed = models.IntegerField()
    reason = models.CharField(max_length=20, choices=ChangeReasons.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['product', '-created_at']),
        ]

    def __str__(self):
        return f"{self.product.name} changed by {self.quantity_changed} ({self.reason})"