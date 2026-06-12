from .models import Order, OrderLine
from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError
from apps.products.services import ProductService

class SalesService:
    def process_checkout(self, business, items_data, payment_method):
        with transaction.atomic():
            order = Order.objects.create(business=business,payment_method=payment_method)
            product_service = ProductService()
            for item in items_data:
                product = product_service.get_product(item['product_id'], business)
                OrderLine.objects.create(
                    order=order,
                    product=product,
                    quantity_sold=item['quantity'],
                    unit_price_at_sale=product.price
                )
                product_service.decrease_stock(
                    product_id=product.id,
                    business=business,
                    amount=item['quantity']
                )
            return order