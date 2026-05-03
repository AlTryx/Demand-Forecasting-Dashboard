from django.db import models
from ...core.models import TimeStampedModel

class Product(TimeStampedModel):
    name = models.CharField(max_length=20, blank=False)
    category = models.CharField(max_length=20, blank=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    current_stock = models.IntegerField()
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(current_stock__gte=0),
                name='current_stock_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(price__gte=0),
                name='price_gte_0'
            )
        ]