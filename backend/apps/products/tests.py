from django.test import TestCase
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.products.models import Product
from apps.products.services import ProductService
from apps.sales.tests import make_user


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


class ProductApiTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name="Shop")
        self.client = APIClient()
        self.client.force_authenticate(make_user("owner", self.business))
        self.product = Product.objects.create(
            name="Tea", category="Drinks", price=2, current_stock=3, business=self.business
        )

    def test_create_with_sku_saves_the_sku(self):
        response = self.client.post(
            "/api/products/",
            {"name": "Coffee", "category": "Drinks", "price": "4.50", "current_stock": 5, "stock_keeping_unit": "COF-1"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.get(id=response.data["id"]).stock_keeping_unit, "COF-1")

    def test_removing_more_stock_than_available_gives_a_readable_error(self):
        response = self.client.post(
            f"/api/products/{self.product.id}/decrease_stock/",
            {"amount": 10, "reason": "WASTE"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"error": "Not enough stock"})

    def test_restock_updates_stock_and_writes_one_log_row(self):
        response = self.client.post(
            f"/api/products/{self.product.id}/increase_stock/",
            {"amount": 7, "reason": "RESTOCK"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["current_stock"], 10)
        self.assertEqual(
            list(self.product.stock_logs.values_list("quantity_changed", "reason")),
            [(7, "RESTOCK")],
        )
