import logging
from decimal import Decimal

import pandas as pd
from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.businesses.models import Business
from apps.products.models import Product
from apps.sales.models import DailySales, OrderLine
from . import ml
from .models import ForecastResult

logger = logging.getLogger(__name__)


class ForecastingService:
    def get_latest_forecast_for_product(self, business, product_id):
        try:
            product = Product.objects.get(id=product_id, business=business)
        except Product.DoesNotExist:
            raise NotFound("Product not found or access denied.")
        return ForecastResult.objects.filter(product=product).select_related("product")

    def get_latest_n_forecasts(self, business_id):
        try:
            business = Business.objects.get(id=business_id)
        except Business.DoesNotExist:
            raise NotFound("Business not found or access denied.")
        return (
            ForecastResult.objects.filter(product__business=business)
            .select_related("product")
            .order_by('-created_at')[:100]
        )

    @classmethod
    def run_prediction_pipeline(cls, as_of=None):
        daily = cls._fetch_sales_data()
        output = ml.forecast(daily, as_of=as_of or timezone.localdate())

        if output.predictions.empty:
            logger.warning("No complete week of sales found; nothing to forecast")
            return False

        if output.report is None:
            logger.warning("Too little sales history to validate the model; every product gets the naive fallback")
        else:
            logger.info(output.report.summary())

        cls._save_predictions(output.predictions)
        return True

    @classmethod
    def run_for_business(cls, business) -> int:
        daily = cls._fetch_business_sales(business)
        if daily.empty:
            return 0

        as_of = pd.Timestamp(daily["date"].max()) + pd.Timedelta(days=1)
        output = ml.forecast(daily, as_of=as_of)
        if output.predictions.empty:
            logger.warning("Business %s has no complete week of sales; nothing to forecast", business.id)
            return 0
        if output.report is not None:
            logger.info(output.report.summary())
        return cls._save_predictions(output.predictions)

    @staticmethod
    def _fetch_business_sales(business):
        rows = (
            DailySales.objects.filter(business=business)
            .values_list("product_id", "date", "units")
            .iterator(chunk_size=50_000)
        )
        return pd.DataFrame.from_records(rows, columns=["series_id", "date", "quantity"])

    @staticmethod
    def _fetch_sales_data():
        sales_qs = (
            OrderLine.objects.filter(product__isnull=False)
            .annotate(date=TruncDate('order__created_at'))
            .values('product_id', 'date')
            .annotate(quantity=Sum('quantity_sold'))
            .order_by('product_id', 'date')
        )
        daily = pd.DataFrame(list(sales_qs), columns=['product_id', 'date', 'quantity'])
        return daily.rename(columns={'product_id': 'series_id'})

    @staticmethod
    def _save_predictions(predictions):
        forecasts = [
            ForecastResult(
                product_id=int(row.series_id),
                week_start=pd.Timestamp(row.week_start).date(),
                predicted_quantity=round(row.predicted),
                lower_bound=None if pd.isna(row.lower) else round(row.lower),
                upper_bound=None if pd.isna(row.upper) else round(row.upper),
                horizon=ForecastResult.HorizonOptions.ONE_WEEK,
                confidence_score=Decimal(str(round(row.confidence, 4))),
            )
            for row in predictions.itertuples()
        ]
        with transaction.atomic():
            ForecastResult.objects.bulk_create(forecasts, batch_size=1_000)
        logger.info("Saved %d forecasts", len(forecasts))
        return len(forecasts)
