import datetime

import numpy as np
import pandas as pd
from django.test import SimpleTestCase, TestCase

from apps.businesses.models import Business
from apps.products.models import Product
from apps.sales.models import Order, OrderLine
from . import ml
from .models import ForecastResult
from .services import ForecastingService

MONDAY = pd.Timestamp("2024-01-01")


def synthetic_sales(series_count=20, weeks=120, seed=0):
    rng = np.random.default_rng(seed)
    days = pd.date_range(MONDAY, periods=weeks * 7, freq="D")
    day_of_year = days.dayofyear.to_numpy()
    weekday_factor = np.array([0.8, 0.9, 0.9, 1.0, 1.1, 1.3, 1.0])[days.weekday]
    frames = []
    for series_id in range(series_count):
        level = rng.uniform(2, 40)
        season = 1 + 0.4 * np.sin(2 * np.pi * (day_of_year + 20 * series_id) / 365)
        frames.append(
            pd.DataFrame(
                {"series_id": series_id, "date": days, "quantity": rng.poisson(level * season * weekday_factor)}
            )
        )
    return pd.concat(frames, ignore_index=True)


class WeeklyAggregationTests(SimpleTestCase):
    def test_weeks_without_sales_are_filled_with_zero(self):
        daily = pd.DataFrame(
            {"series_id": [1, 1], "date": [MONDAY, MONDAY + pd.Timedelta(weeks=2)], "quantity": [5, 3]}
        )

        weekly = ml.to_weekly(daily, as_of=MONDAY + pd.Timedelta(weeks=3))

        self.assertEqual(weekly["quantity"].tolist(), [5.0, 0.0, 3.0])

    def test_unfinished_week_is_left_out(self):
        daily = pd.DataFrame(
            {"series_id": [1, 1], "date": [MONDAY, MONDAY + pd.Timedelta(days=8)], "quantity": [5, 9]}
        )

        weekly = ml.to_weekly(daily, as_of=MONDAY + pd.Timedelta(days=9))

        self.assertEqual(weekly["week_start"].tolist(), [MONDAY])

    def test_series_that_stopped_selling_runs_up_to_the_last_complete_week(self):
        daily = pd.DataFrame({"series_id": [1, 2], "date": [MONDAY, MONDAY + pd.Timedelta(weeks=3)], "quantity": [4, 6]})

        weekly = ml.to_weekly(daily, as_of=MONDAY + pd.Timedelta(weeks=4))

        self.assertEqual(weekly[weekly["series_id"] == 1]["quantity"].tolist(), [4.0, 0.0, 0.0, 0.0])

    def test_empty_input_gives_empty_frame(self):
        weekly = ml.to_weekly(pd.DataFrame(columns=["series_id", "date", "quantity"]))

        self.assertTrue(weekly.empty)


class FeatureTests(SimpleTestCase):
    def test_features_of_a_week_do_not_depend_on_that_weeks_sales(self):
        weekly = ml.to_weekly(synthetic_sales(series_count=2, weeks=30))
        changed = weekly.copy()
        last_week = changed["week_start"].max()
        changed.loc[changed["week_start"] == last_week, "quantity"] += 1000

        original_rows = ml.build_features(weekly).query("week_start == @last_week")
        changed_rows = ml.build_features(changed).query("week_start == @last_week")

        pd.testing.assert_frame_equal(
            original_rows[ml.FEATURE_COLUMNS].reset_index(drop=True),
            changed_rows[ml.FEATURE_COLUMNS].reset_index(drop=True),
        )

    def test_rolling_windows_stay_inside_one_series(self):
        daily = pd.concat(
            [
                pd.DataFrame({"series_id": 1, "date": pd.date_range(MONDAY, periods=70), "quantity": 100}),
                pd.DataFrame({"series_id": 2, "date": pd.date_range(MONDAY, periods=70), "quantity": 1}),
            ]
        )

        features = ml.build_features(ml.to_weekly(daily))

        self.assertEqual(features[features["series_id"] == 2]["level"].dropna().unique().tolist(), [7.0])


class ForecastTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.sales = synthetic_sales()
        cls.output = ml.forecast(cls.sales)

    def test_model_beats_same_as_last_week(self):
        report = self.output.report

        self.assertIsNotNone(report)
        self.assertLess(report.model_wape, report.naive_wape)

    def test_one_forecast_per_series_for_the_week_after_the_data(self):
        predictions = self.output.predictions
        last_week = ml.to_weekly(self.sales)["week_start"].max()

        self.assertEqual(sorted(predictions["series_id"]), list(range(20)))
        self.assertTrue((predictions["week_start"] == last_week + pd.Timedelta(weeks=1)).all())
        self.assertTrue((predictions["method"] == "lightgbm").all())

    def test_intervals_are_ordered_and_non_negative(self):
        predictions = self.output.predictions

        self.assertTrue((predictions["lower"] >= 0).all())
        self.assertTrue((predictions["lower"] <= predictions["predicted"]).all())
        self.assertTrue((predictions["predicted"] <= predictions["upper"]).all())

    def test_confidence_is_between_zero_and_one(self):
        confidence = self.output.predictions["confidence"]

        self.assertTrue(confidence.between(0, 1).all())

    def test_new_product_gets_naive_fallback_without_blocking_the_others(self):
        last_day = self.sales["date"].max()
        new_product = pd.DataFrame(
            {"series_id": 99, "date": pd.date_range(last_day - pd.Timedelta(days=13), last_day), "quantity": 2}
        )

        predictions = ml.forecast(pd.concat([self.sales, new_product])).predictions.set_index("series_id")

        self.assertEqual(predictions.loc[99, "method"], "naive")
        self.assertEqual(predictions.loc[99, "predicted"], 14)
        self.assertEqual(predictions.loc[99, "confidence"], 0)
        self.assertTrue(pd.isna(predictions.loc[99, "upper"]))
        self.assertEqual((predictions["method"] == "lightgbm").sum(), 20)

    def test_too_little_data_gives_everyone_the_naive_fallback(self):
        output = ml.forecast(synthetic_sales(series_count=2, weeks=10))

        self.assertIsNone(output.report)
        self.assertEqual(len(output.predictions), 2)
        self.assertTrue((output.predictions["method"] == "naive").all())

    def test_no_sales_gives_no_forecasts(self):
        output = ml.forecast(pd.DataFrame(columns=["series_id", "date", "quantity"]))

        self.assertTrue(output.predictions.empty)
        self.assertIsNone(output.report)


class ForecastingServiceTests(TestCase):
    def test_pipeline_saves_one_forecast_per_product_with_sales(self):
        shop = Business.objects.create(name="Established shop")
        products = [
            Product.objects.create(name=f"Item {i}", category="Food", price=1, current_stock=100, business=shop)
            for i in range(8)
        ]
        new_shop = Business.objects.create(name="New shop")
        new_product = Product.objects.create(name="New item", category="Food", price=1, current_stock=10, business=new_shop)
        unsold = Product.objects.create(name="Unsold", category="Food", price=1, current_stock=10, business=shop)

        start = datetime.datetime(2024, 1, 1, 12, tzinfo=datetime.timezone.utc)
        weeks = 40
        lines = []
        for day in range(weeks * 7):
            order = Order.objects.create(business=shop, created_at=start + datetime.timedelta(days=day))
            lines += [
                OrderLine(order=order, product=product, quantity_sold=1 + (day + i) % 5, unit_price_at_sale=1)
                for i, product in enumerate(products)
            ]
        for day in range(weeks * 7 - 14, weeks * 7):
            order = Order.objects.create(business=new_shop, created_at=start + datetime.timedelta(days=day))
            lines.append(OrderLine(order=order, product=new_product, quantity_sold=3, unit_price_at_sale=1))
        OrderLine.objects.bulk_create(lines)

        succeeded = ForecastingService.run_prediction_pipeline(as_of=(start + datetime.timedelta(weeks=weeks)).date())

        self.assertTrue(succeeded)
        forecasts = {f.product_id: f for f in ForecastResult.objects.all()}
        self.assertEqual(set(forecasts), {p.id for p in products} | {new_product.id})
        self.assertNotIn(unsold.id, forecasts)
        self.assertIsNotNone(forecasts[products[0].id].upper_bound)
        self.assertEqual(forecasts[new_product.id].predicted_quantity, 21)
        self.assertIsNone(forecasts[new_product.id].upper_bound)
        self.assertEqual(forecasts[new_product.id].confidence_score, 0)

    def test_pipeline_without_sales_saves_nothing(self):
        self.assertFalse(ForecastingService.run_prediction_pipeline())
        self.assertEqual(ForecastResult.objects.count(), 0)
