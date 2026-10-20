from django.test import TestCase

from apps.businesses.models import Business
from apps.products.models import Product
from apps.products.services import ProductService


class ProductServiceTests(TestCase):
    def test_create_product_creates_record_with_given_values(self):
        business = Business.objects.create(name="Test Business")

        product = ProductService.create_product(
            name="Laptop",
            category="Electronics",
            price=999.99,
            current_stock=20,
            business=business,
        )

        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(product.name, "Laptop")
        self.assertEqual(product.category, "Electronics")
        self.assertEqual(product.price, 999.99)
        self.assertEqual(product.current_stock, 20)
        self.assertEqual(product.business, business)
        self.assertIsNotNone(product.id)
