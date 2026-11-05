from datetime import date, timedelta

from django.db.models import Count, Max, Min, Q, Sum
from django.db.models.functions import TruncWeek
from rest_framework.exceptions import NotFound

from apps.forecasting.models import ForecastResult
from apps.products.models import Product
from apps.sales.models import DailySales

WEEK = timedelta(days=7)


def monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def last_complete_week(latest: date) -> date:
    return monday(latest + timedelta(days=1) - WEEK)


class AnalyticsService:
    def __init__(self, business, product_id: int | None = None):
        if product_id is not None and not Product.objects.filter(id=product_id, business=business).exists():
            raise NotFound("Product not found.")
        self.business = business
        self.product_id = product_id

    def sales(self):
        qs = DailySales.objects.filter(business=self.business)
        return qs.filter(product_id=self.product_id) if self.product_id else qs

    def latest_date(self) -> date | None:
        return self.sales().aggregate(latest=Max("date"))["latest"]

    def summary(self) -> dict:
        qs = self.sales()
        totals = qs.aggregate(
            total_units=Sum("units"),
            total_revenue=Sum("revenue"),
            first=Min("date"),
            last=Max("date"),
            products=Count("product_id", distinct=True),
        )
        if totals["last"] is None:
            return {
                "has_data": False,
                "product_count": 0,
                "total_units": 0,
                "total_revenue": 0.0,
                "date_from": None,
                "date_to": None,
                "last_week_units": 0,
                "previous_week_units": 0,
                "avg_unit_price": None,
            }

        week = last_complete_week(totals["last"])
        recent = qs.filter(date__gte=week - WEEK, date__lt=week + WEEK).aggregate(
            last_week=Sum("units", filter=Q(date__gte=week)),
            previous_week=Sum("units", filter=Q(date__lt=week)),
        )
        units = totals["total_units"] or 0
        revenue = float(totals["total_revenue"] or 0)
        return {
            "has_data": True,
            "product_count": totals["products"],
            "total_units": units,
            "total_revenue": revenue,
            "date_from": totals["first"],
            "date_to": totals["last"],
            "last_week_units": recent["last_week"] or 0,
            "previous_week_units": recent["previous_week"] or 0,
            "avg_unit_price": round(revenue / units, 2) if units else None,
        }

    def timeline(self, weeks: int) -> dict:
        latest = self.latest_date()
        if latest is None:
            return {"weeks": [], "forecast": None}

        end = last_complete_week(latest)
        start = end - (weeks - 1) * WEEK
        rows = (
            self.sales()
            .filter(date__gte=start, date__lt=end + WEEK)
            .annotate(week=TruncWeek("date"))
            .values("week")
            .annotate(week_units=Sum("units"), week_revenue=Sum("revenue"))
        )
        by_week = {row["week"]: row for row in rows}
        series = []
        for i in range(weeks):
            week = start + i * WEEK
            row = by_week.get(week)
            series.append({
                "week_start": week,
                "units": row["week_units"] if row else 0,
                "revenue": float(row["week_revenue"]) if row else 0.0,
            })
        return {"weeks": series, "forecast": self.forecast_for(end + WEEK)}

    def forecast_for(self, week_start: date) -> dict | None:
        qs = ForecastResult.objects.filter(product__business=self.business, week_start=week_start)
        if self.product_id:
            qs = qs.filter(product_id=self.product_id)
        latest = list(qs.order_by("product_id", "-generated_at").distinct("product_id"))
        if not latest:
            return None

        predicted = sum(f.predicted_quantity for f in latest)
        has_bounds = all(f.lower_bound is not None and f.upper_bound is not None for f in latest)
        if predicted:
            confidence = sum(float(f.confidence_score) * f.predicted_quantity for f in latest) / predicted
        else:
            confidence = sum(float(f.confidence_score) for f in latest) / len(latest)
        return {
            "week_start": week_start,
            "predicted": predicted,
            "lower": sum(f.lower_bound for f in latest) if has_bounds else None,
            "upper": sum(f.upper_bound for f in latest) if has_bounds else None,
            "confidence": round(confidence, 4),
        }

    def top_products(self, limit: int, weeks: int | None, order_by: str) -> dict:
        qs = self.sales()
        if weeks:
            latest = self.latest_date()
            if latest is None:
                qs = qs.none()
            else:
                end = last_complete_week(latest)
                qs = qs.filter(date__gte=end - (weeks - 1) * WEEK, date__lt=end + WEEK)

        sort_field = "product_units" if order_by == "units" else "product_revenue"
        top = list(
            qs.values("product_id", "product__name", "product__stock_keeping_unit")
            .annotate(product_units=Sum("units"), product_revenue=Sum("revenue"))
            .order_by(f"-{sort_field}", "product_id")[:limit]
        )
        totals = qs.aggregate(
            total_units=Sum("units"),
            total_revenue=Sum("revenue"),
            products=Count("product_id", distinct=True),
        )

        total_units = totals["total_units"] or 0
        total_revenue = float(totals["total_revenue"] or 0)
        top_units = sum(p["product_units"] for p in top)
        top_revenue = sum(float(p["product_revenue"]) for p in top)
        return {
            "items": [
                {
                    "id": p["product_id"],
                    "name": p["product__name"],
                    "sku": p["product__stock_keeping_unit"],
                    "units": p["product_units"],
                    "revenue": float(p["product_revenue"]),
                }
                for p in top
            ],
            "other": {
                "units": total_units - top_units,
                "revenue": round(total_revenue - top_revenue, 2),
                "product_count": totals["products"] - len(top),
            },
            "total_units": total_units,
            "total_revenue": total_revenue,
        }
