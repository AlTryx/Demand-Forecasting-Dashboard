import datetime
import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.forecasting.models import ForecastResult
from apps.inventory.models import Inventory
from apps.products.models import Product, StockLog
from apps.sales.models import DailySales, ImportJob, Order
from apps.users.models import BusinessUser, User

MONDAY = datetime.date(2026, 10, 5)


def make_user(username):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass12345!",
        first_name="Test",
        last_name="User",
    )


def client_for(user, business=None):
    client = APIClient()
    client.force_authenticate(user)
    if business is not None:
        response = client.post(f"/api/businesses/{business.id}/activate/")
        assert response.status_code == 200, response.content
    return client


class TenantIsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.shop_a = Business.objects.create(name="Alice shop")
        cls.shop_b = Business.objects.create(name="Bob shop")
        cls.alice = make_user("alice")
        cls.bob = make_user("bob")
        BusinessUser.objects.create(user=cls.alice, business=cls.shop_a, role=BusinessUser.Roles.OWNER)
        BusinessUser.objects.create(user=cls.bob, business=cls.shop_b, role=BusinessUser.Roles.OWNER)

        cls.alices_product = Product.objects.create(
            name="Alice tea", category="Drinks", price=2, current_stock=10, business=cls.shop_a
        )
        cls.bobs_product = Product.objects.create(
            name="Bob coffee", category="Drinks", price=3, current_stock=50, business=cls.shop_b
        )
        cls.bobs_empty_product = Product.objects.create(
            name="Bob sugar", category="Food", price=1, current_stock=0, business=cls.shop_b
        )
        DailySales.objects.bulk_create(
            DailySales(business=cls.shop_b, product=cls.bobs_product, date=MONDAY + datetime.timedelta(days=d), units=40, revenue=120)
            for d in range(14)
        )
        cls.bobs_forecast = ForecastResult.objects.create(
            product=cls.bobs_product,
            week_start=MONDAY + datetime.timedelta(weeks=2),
            predicted_quantity=280,
            horizon=ForecastResult.HorizonOptions.ONE_WEEK,
            confidence_score=0.9,
        )
        cls.bobs_inventory = Inventory.objects.create(product=cls.bobs_product, days_of_stock_left=9)
        cls.bobs_import = ImportJob.objects.create(
            business=cls.shop_b, created_by=cls.bob, file_name="bob.csv", file_path="bob.csv"
        )

    def setUp(self):
        self.client = client_for(self.alice, self.shop_a)

    def assert_bob_untouched(self):
        self.bobs_product.refresh_from_db()
        self.assertEqual(self.bobs_product.name, "Bob coffee")
        self.assertEqual(self.bobs_product.current_stock, 50)
        self.assertFalse(StockLog.objects.filter(product=self.bobs_product).exists())

    def assert_no_bob_data(self, response):
        body = json.dumps(response.data, default=str)
        self.assertNotIn("Bob", body)
        self.assertNotIn(f'"id": {self.bobs_product.id},', body)

    def test_business_list_shows_only_own_memberships(self):
        response = self.client.get("/api/businesses/")

        self.assertEqual([b["id"] for b in response.data], [self.shop_a.id])

    def test_cannot_switch_to_a_business_you_are_not_a_member_of(self):
        response = self.client.post(f"/api/businesses/{self.shop_b.id}/activate/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get("/api/businesses/me/").data["id"], self.shop_a.id)

    def test_product_detail_endpoints_return_404_for_another_shops_product(self):
        url = f"/api/products/{self.bobs_product.id}/"
        requests = {
            "GET detail": lambda: self.client.get(url),
            "PUT": lambda: self.client.put(url, {"name": "x", "category": "x", "price": "1", "current_stock": 0}, format="json"),
            "PATCH": lambda: self.client.patch(url, {"name": "hacked"}, format="json"),
            "increase_stock": lambda: self.client.post(f"{url}increase_stock/", {"amount": 5, "reason": "RESTOCK"}, format="json"),
            "decrease_stock": lambda: self.client.post(f"{url}decrease_stock/", {"amount": 5, "reason": "WASTE"}, format="json"),
            "DELETE": lambda: self.client.delete(url),
        }
        for label, send in requests.items():
            with self.subTest(label):
                self.assertEqual(send().status_code, 404)

        self.assert_bob_untouched()

    def test_product_lists_never_include_another_shops_products(self):
        lists = {
            "list": "/api/products/",
            "search": "/api/products/search/?q=Bob",
            "low_stock": "/api/products/low_stock/?threshold=1000",
            "out_of_stock": "/api/products/out_of_stock/",
        }
        for label, url in lists.items():
            with self.subTest(label):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assert_no_bob_data(response)

    def test_creating_a_product_ignores_a_business_id_in_the_body(self):
        response = self.client.post(
            "/api/products/",
            {"name": "Sneaky", "category": "x", "price": "1", "current_stock": 1, "business": self.shop_b.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.get(id=response.data["id"]).business, self.shop_a)

    def test_checkout_cannot_sell_another_shops_product(self):
        response = self.client.post(
            "/api/sales/checkout/",
            {"payment_method": "CASH", "items": [{"product_id": self.bobs_product.id, "quantity": 1}]},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(Order.objects.exists())
        self.assert_bob_untouched()

    def test_import_job_of_another_shop_is_not_found(self):
        response = self.client.get(f"/api/sales/imports/{self.bobs_import.id}/")

        self.assertEqual(response.status_code, 404)

    def test_forecasts_of_another_shop_are_hidden(self):
        listing = self.client.get("/api/forecasting/results/")
        detail = self.client.get("/api/forecasting/results/", {"product_id": self.bobs_product.id})

        self.assertEqual(listing.status_code, 200)
        self.assert_no_bob_data(listing)
        self.assertEqual(detail.status_code, 404)

    def test_running_a_forecast_never_touches_another_shop(self):
        before = ForecastResult.objects.filter(product__business=self.shop_b).values_list("id", "predicted_quantity")
        before = list(before)

        response = self.client.post("/api/forecasting/results/run/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["forecasts_created"], 0)
        self.assertEqual(
            list(ForecastResult.objects.filter(product__business=self.shop_b).values_list("id", "predicted_quantity")),
            before,
        )

    def test_inventory_of_another_shop_is_hidden(self):
        listing = self.client.get("/api/inventory/results/")
        detail = self.client.get(f"/api/inventory/results/{self.bobs_inventory.id}/")

        self.assertEqual(listing.status_code, 200)
        self.assert_no_bob_data(listing)
        self.assertEqual(detail.status_code, 404)

    def test_analytics_never_include_another_shops_sales(self):
        summary = self.client.get("/api/analytics/summary/")
        top = self.client.get("/api/analytics/top-products/")
        timeline = self.client.get("/api/analytics/timeline/")

        self.assertEqual(summary.data["total_units"], 0)
        self.assertFalse(summary.data["has_data"])
        self.assert_no_bob_data(top)
        self.assert_no_bob_data(timeline)

    def test_analytics_for_another_shops_product_are_not_found(self):
        for endpoint in ("summary", "timeline"):
            with self.subTest(endpoint):
                response = self.client.get(f"/api/analytics/{endpoint}/", {"product_id": self.bobs_product.id})
                self.assertEqual(response.status_code, 404)

    def test_removed_member_loses_access_to_the_business(self):
        BusinessUser.objects.filter(user=self.alice, business=self.shop_a).delete()

        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, 403)


class NoActiveBusinessTests(TestCase):
    endpoints = [
        ("get", "/api/businesses/me/", None),
        ("get", "/api/products/", None),
        ("post", "/api/products/", {"name": "x", "category": "x", "price": "1", "current_stock": 1}),
        ("post", "/api/sales/checkout/", {"payment_method": "CASH", "items": [{"product_id": 1, "quantity": 1}]}),
        ("get", "/api/sales/imports/1/", None),
        ("get", "/api/forecasting/results/", None),
        ("post", "/api/forecasting/results/run/", None),
        ("get", "/api/inventory/results/", None),
        ("get", "/api/analytics/summary/", None),
        ("get", "/api/analytics/timeline/", None),
        ("get", "/api/analytics/top-products/", None),
    ]

    def test_every_business_scoped_endpoint_gives_the_same_403(self):
        client = client_for(make_user("newcomer"))

        for method, url, body in self.endpoints:
            with self.subTest(f"{method.upper()} {url}"):
                response = getattr(client, method)(url, body, format="json")
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.data["detail"].code, "no_active_business")

    def test_csv_upload_gives_the_same_403(self):
        client = client_for(make_user("newcomer"))
        upload = SimpleUploadedFile("sales.csv", b"date,product,units,revenue\n", content_type="text/csv")

        response = client.post("/api/sales/imports/", {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"].code, "no_active_business")
