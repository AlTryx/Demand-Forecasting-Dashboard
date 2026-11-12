from django.conf import settings
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


class DailySales(models.Model):
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='daily_sales')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='daily_sales')
    date = models.DateField()
    units = models.PositiveIntegerField()
    revenue = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product', 'date'], name='daily_sales_product_date_uniq'),
        ]
        indexes = [
            models.Index(fields=['business', 'date']),
        ]

    def __str__(self):
        return f"{self.product_id} on {self.date}: {self.units} units"


class ImportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='import_jobs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    rows_processed = models.PositiveIntegerField(default=0)
    rows_written = models.PositiveIntegerField(default=0)
    rows_skipped = models.PositiveIntegerField(default=0)
    products_created = models.PositiveIntegerField(default=0)
    row_errors = models.JSONField(default=list, blank=True)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['business', 'status']),
        ]

    def __str__(self):
        return f"Import #{self.id} ({self.status}) - {self.file_name}"
