from .models import Product
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

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

    def get_product(self, product_id):
        try:
            return Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValueError("Product does not exist.")

    def get_all_products(self, business):
        return Product.objects.filter(business=business).order_by("created_at")

    def update_product(self, product_id, **kwargs):
        product = self.get_product(product_id)
        for field, value in kwargs.items():
            if hasattr(product, field):
                setattr(product, field, value)
        product.save()
        return product

    def delete_product(self, product_id):
        product = self.get_product(product_id)
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

    def decrease_stock(self, product_id, amount):
        if amount <= 0:
            raise ValueError("Amount must be positive")
        product = self.get_product(product_id)
        if product.current_stock < amount:
            raise ValueError("Not enough stock")
        product.current_stock -= amount
        product.save()
        return product

    def increase_stock(self, product_id, amount):
        if amount <= 0:
            raise ValueError("Amount must be positive")
        product = self.get_product(product_id)
        #TO DO: check for derivative and cap given by prediction
        product.current_stock += amount
        product.save()
        return product