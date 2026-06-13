from .models import Product, StockLog
from rest_framework.exceptions import NotFound, ValidationError

class ProductService:
    @staticmethod
    def create_product(name, category, price, current_stock, business):
        return Product.objects.create(
            name=name,
            category=category,
            price=price,
            current_stock=current_stock,
            business=business
        )

    @staticmethod
    def create_stock_log(product, quantity_changed, reason):
        return StockLog.objects.create(
            product=product,
            quantity_changed=quantity_changed,
            reason=reason
        )

    def get_product(self, product_id, business):
        try:
            return Product.objects.get(id=product_id, business=business)
        except Product.DoesNotExist:
            raise NotFound("Product does not exist.")

    def get_all_products(self, business):
        return Product.objects.filter(business=business).order_by("created_at").select_related('business')

    def get_all_active_products_for_system(self):
        return Product.objects.all()

    def update_product(self, product_id, business, **kwargs):
        product = self.get_product(product_id, business)

        for field, value in kwargs.items():
            if hasattr(product, field):
                setattr(product, field, value)

        product.save()
        return product

    def delete_product(self, product_id, business):
        product = self.get_product(product_id, business)
        product.delete()

    def get_products_by_category(self, business, category):
        return Product.objects.filter(business=business, category=category)

    def get_products_by_business(self, business):
        return Product.objects.filter(business=business)

    def search_products_by_name(self, business, query):
        return Product.objects.filter(
            business=business,
            name__icontains=query
        )

    def get_low_stock_products(self, business, threshold):
        return Product.objects.filter(
            business=business,
            current_stock__lte=threshold
        )

    def get_out_of_stock_products(self, business):
        return Product.objects.filter(
            business=business,
            current_stock=0
        )

    def decrease_stock(self, product_id, business, amount, reason=StockLog.ChangeReasons.SALE):
        if amount <= 0:
            raise ValidationError("Amount must be positive")

        product = self.get_product(product_id, business)

        if product.current_stock < amount:
            raise ValidationError("Not enough stock")

        product.current_stock -= amount
        product.save()

        self.create_stock_log(product, -amount, reason)
        return product

    def increase_stock(self, product_id, business, amount, reason=StockLog.ChangeReasons.RESTOCK):
        if amount <= 0:
            raise ValidationError("Amount must be positive")

        product = self.get_product(product_id, business)

        product.current_stock += amount
        product.save()

        self.create_stock_log(product, amount, reason)
        return product