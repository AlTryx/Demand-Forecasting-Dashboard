from django.db import models
from ...core.models import TimeStampedModel

class SalesRecord(TimeStampedModel):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    date = models.DateField()
    quantity_sold = models.IntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity_sold__gte=0),
                name='quantity_sold_gte_0'
            )
        ]