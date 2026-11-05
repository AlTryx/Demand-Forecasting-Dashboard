from datetime import date, timedelta
from decimal import Decimal

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.forecasting.models import ForecastResult
from apps.products.models import Product
from apps.sales.models import DailySales
from apps.sales.tests import make_user
from .services import last_complete_week

MONDAY = date(2017, 1, 2)


class LastCompleteWeekTests(SimpleTestCase):
    def test_data_ending_on_sunday_counts_that_week_as_complete(self):
        self.assertEqual(last_complete_week(date(2017, 1, 15)), date(2017, 1, 9))

    def test_data_ending_midweek_uses_the_week_before(self):
        self.assertEqual(last_complete_week(date(2017, 1, 18)), date(2017, 1, 9))


class AnalyticsEndpointTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name="Shop")
        self.client = APIClient()
        self.client.force_authenticate(make_user("owner", self.business))
        self.mug = self.product("Mug", sku="MUG-1")
        self.beans = self.product("Beans")
        self.tea = self.product("Tea")

    def product(self, name, sku=None, business=None):
        return Product.objects.create(
            name=name,
            category="Imported",
            price=0,
            current_stock=0,
            business=business or self.business,
            stock_keeping_unit=sku,
        )

    def sell(self, product, day, units, revenue):
        DailySales.objects.create(
            business=product.business, product=product, date=day, units=units, revenue=Decimal(revenue)
        )

    def two_weeks_of_mugs(self):
        for offset in range(14):
            self.sell(self.mug, MONDAY + timedelta(days=offset), 1 if offset < 7 else 2, "10.00")

    def get(self, path, **params):
        return self.client.get(f"/api/analytics/{path}/", params)

    def test_summary_without_data_reports_has_data_false(self):
        response = self.get("summary")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["has_data"])
        self.assertIsNone(response.data["avg_unit_price"])

    def test_summary_compares_the_last_two_complete_weeks_of_the_data(self):
        self.two_weeks_of_mugs()

        data = self.get("summary").data

        self.assertTrue(data["has_data"])
        self.assertEqual(data["total_units"], 21)
        self.assertEqual(data["total_revenue"], 140.0)
        self.assertEqual(data["last_week_units"], 14)
        self.assertEqual(data["previous_week_units"], 7)
        self.assertEqual(data["date_from"], MONDAY)
        self.assertEqual(data["date_to"], MONDAY + timedelta(days=13))
        self.assertEqual(data["avg_unit_price"], 6.67)
        self.assertEqual(data["product_count"], 1)

    def test_summary_for_one_product_ignores_the_others(self):
        self.two_weeks_of_mugs()
        self.sell(self.beans, MONDAY, 100, "500.00")

        data = self.get("summary", product_id=self.beans.id).data

        self.assertEqual(data["total_units"], 100)

    def test_product_of_another_business_is_not_found(self):
        foreign = self.product("Foreign", business=Business.objects.create(name="Other"))

        response = self.get("summary", product_id=foreign.id)

        self.assertEqual(response.status_code, 404)

    def test_timeline_fills_weeks_without_sales_with_zero(self):
        self.two_weeks_of_mugs()

        weeks = self.get("timeline", weeks=4).data["weeks"]

        self.assertEqual([w["week_start"] for w in weeks], [MONDAY + timedelta(weeks=i) for i in range(-2, 2)])
        self.assertEqual([w["units"] for w in weeks], [0, 0, 7, 14])
        self.assertEqual(weeks[-1]["revenue"], 70.0)

    def test_timeline_includes_the_latest_forecast_for_the_week_after_the_data(self):
        self.two_weeks_of_mugs()
        next_week = MONDAY + timedelta(weeks=2)
        for hours_ago, predicted in ((2, 5), (1, 15)):
            forecast = ForecastResult.objects.create(
                product=self.mug,
                predicted_quantity=predicted,
                lower_bound=predicted - 2,
                upper_bound=predicted + 2,
                horizon=7,
                confidence_score=Decimal("0.8000"),
                week_start=next_week,
            )
            ForecastResult.objects.filter(pk=forecast.pk).update(
                generated_at=timezone.now() - timedelta(hours=hours_ago)
            )

        forecast = self.get("timeline").data["forecast"]

        self.assertEqual(forecast["week_start"], next_week)
        self.assertEqual(forecast["predicted"], 15)
        self.assertEqual((forecast["lower"], forecast["upper"]), (13, 17))
        self.assertEqual(forecast["confidence"], 0.8)

    def test_timeline_without_forecast_returns_null(self):
        self.two_weeks_of_mugs()

        self.assertIsNone(self.get("timeline").data["forecast"])

    def test_top_products_puts_the_rest_into_other(self):
        self.sell(self.mug, MONDAY, 10, "10.00")
        self.sell(self.beans, MONDAY, 2, "40.00")
        self.sell(self.tea, MONDAY, 5, "5.00")

        by_units = self.get("top-products", limit=2, order_by="units").data
        by_revenue = self.get("top-products", limit=1, order_by="revenue").data

        self.assertEqual([p["name"] for p in by_units["items"]], ["Mug", "Tea"])
        self.assertEqual(by_units["items"][0]["sku"], "MUG-1")
        self.assertEqual(by_units["other"], {"units": 2, "revenue": 40.0, "product_count": 1})
        self.assertEqual(by_units["total_units"], 17)
        self.assertEqual([p["name"] for p in by_revenue["items"]], ["Beans"])
        self.assertEqual(by_revenue["other"]["product_count"], 2)

    def test_top_products_window_counts_only_recent_weeks(self):
        self.sell(self.beans, MONDAY, 50, "50.00")
        self.sell(self.mug, MONDAY + timedelta(weeks=4), 1, "1.00")
        self.sell(self.mug, MONDAY + timedelta(weeks=4, days=6), 1, "1.00")

        data = self.get("top-products", limit=5, weeks=1, order_by="units").data

        self.assertEqual([p["name"] for p in data["items"]], ["Mug"])
        self.assertEqual(data["total_units"], 2)

    def test_invalid_parameters_are_rejected(self):
        self.assertEqual(self.get("top-products", limit=0).status_code, 400)
        self.assertEqual(self.get("top-products", order_by="price").status_code, 400)
        self.assertEqual(self.get("timeline", weeks=500).status_code, 400)

    def test_anonymous_user_is_rejected(self):
        self.assertEqual(APIClient().get("/api/analytics/summary/").status_code, 401)
