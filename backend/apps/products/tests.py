from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.products.models import Product, StockLog
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

    def test_stock_history_endpoint_returns_correct_data(self):
        restock = StockLog.objects.create(product=self.product, quantity_changed=5, reason="RESTOCK")
        sale = StockLog.objects.create(product=self.product, quantity_changed=-2, reason="SALE")

        now = timezone.now()
        StockLog.objects.filter(pk=restock.pk).update(created_at=now - timedelta(days=1))
        StockLog.objects.filter(pk=sale.pk).update(created_at=now)

        response = self.client.get(f"/api/products/{self.product.id}/stock_history/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["results"][0]["reason"], "SALE")
        self.assertEqual(response.data["results"][1]["reason"], "RESTOCK")

    def test_stock_history_is_paginated_and_filterable_by_reason(self):
        for index in range(25):
            StockLog.objects.create(
                product=self.product,
                quantity_changed=1 if index % 2 else -1,
                reason="RESTOCK" if index % 2 else "SALE",
            )

        response = self.client.get(
            f"/api/products/{self.product.id}/stock_history/?reason=RESTOCK&page_size=5"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 12)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertTrue(all(row["reason"] == "RESTOCK" for row in response.data["results"]))

    def test_stock_history_filters_by_date_range(self):
        now = timezone.now()
        old_log = StockLog.objects.create(product=self.product, quantity_changed=-1, reason="SALE")
        recent_log = StockLog.objects.create(product=self.product, quantity_changed=3, reason="RESTOCK")
        StockLog.objects.filter(pk=old_log.pk).update(created_at=now - timedelta(days=10))
        StockLog.objects.filter(pk=recent_log.pk).update(created_at=now)

        date_to = now.date().isoformat()
        date_from = (now - timedelta(days=1)).date().isoformat()
        response = self.client.get(
            f"/api/products/{self.product.id}/stock_history/?date_from={date_from}&date_to={date_to}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], recent_log.id)

    def test_stock_history_returns_404_for_another_business_product(self):
        other_business = Business.objects.create(name="Other Shop")
        other_product = Product.objects.create(
            name="Other Tea", category="Drinks", price=3, current_stock=10, business=other_business
        )
        StockLog.objects.create(product=other_product, quantity_changed=-1, reason="SALE")

        response = self.client.get(f"/api/products/{other_product.id}/stock_history/")

        self.assertEqual(response.status_code, 404)
        self.assertFalse(StockLog.objects.filter(product=other_product, quantity_changed=-1).count() == 0)
