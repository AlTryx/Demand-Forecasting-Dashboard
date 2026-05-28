from .models import SalesRecord
from rest_framework.exceptions import NotFound, ValidationError

class SalesService:
    @staticmethod
    def create_sales_record(product, date, quantity_sold):
        return SalesRecord.objects.create(
            product=product,
            date=date,
            quantity_sold=quantity_sold
        )

    def get_sales_record(self, sales_record_id, product):
        try:
            return SalesRecord.objects.get(salesrecord_id=sales_record_id, product=product)
        except SalesRecord.DoesNotExist:
            raise NotFound("Sales record does not exist.")

    def get_all_sales_records(self, product):
        return SalesRecord.objects.filter(product=product).order_by("created_at")

    def update_sales_record(self, sales_record_id, product, **kwargs):
        sales_record = self.get_sales_record(sales_record_id, product)

        for field, value in kwargs.items():
            if hasattr(sales_record, field):
                setattr(sales_record, field, value)

        sales_record.save()
        return sales_record