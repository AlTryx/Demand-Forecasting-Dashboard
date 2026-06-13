from django.db import models
from core.models import TimeStampedModel
from django.core.validators import MinValueValidator
from django.utils import timezone

class Order(models.Model):
    class PaymentMethods(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        TRANSFER = "TRANSFER", "Bank Transfer"

    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(default=timezone.now)
    payment_method = models.CharField(max_length=20, choices=PaymentMethods.choices, default=PaymentMethods.CASH)

    class Meta:
        indexes = [
            models.Index(fields=['business', '-created_at']),
        ]

    def __str__(self):
        return f"Order #{self.id} - Business: {self.business_id} ({self.created_at.date()})"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True, related_name='order_lines')
    quantity_sold = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price_at_sale = models.DecimalField(max_length=10, max_digits=10, decimal_places=2, validators=[MinValueValidator(0.00)])

    class Meta:
        indexes = [
            models.Index(fields=['product']),
        ]

    @property
    def total_line_price(self):
        return self.quantity_sold * self.unit_price_at_sale

    def __str__(self):
        return f"Line Item ({self.quantity_sold}x) for Order #{self.order_id}"