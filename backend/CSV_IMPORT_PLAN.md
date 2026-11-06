# CSV import + analytics: backend plan

The frontend on branch `csv-upload` is already built against the API below.
The contract lives in `frontend/lib/types/analytics.ts`. If you change a field
name here, change it there too.

Estimated size: ~600 lines of app code + ~250 lines of tests.

## Endpoints the frontend calls

| Method | URL | Response type (analytics.ts) | Step |
|---|---|---|---|
| POST | `/api/sales/imports/` (multipart, field `file`) | `ImportJob` (status 202) | 3–5 |
| GET | `/api/sales/imports/{id}/` | `ImportJob` | 5 |
| GET | `/api/analytics/summary/?product_id=` | `SalesSummary` | 6 |
| GET | `/api/analytics/timeline/?product_id=&weeks=12` | `SalesTimeline` | 6 |
| GET | `/api/analytics/top-products/?limit=&weeks=&order_by=units\|revenue` | `TopProducts` | 6 |
| GET | `/api/products/search/?q=` (exists) | `PaginatedResponse<Product>` | 1 |
| GET | `/api/forecasting/results/?product_id=` (exists) | `ForecastResult[]` | 7 |
| POST | `/api/forecasting/results/run/` | `{ forecasts_created: number }` | 7 |

`product_id` missing means the whole business (overview).

## Core decisions

- **The database adds things up, not the browser.** Charts get ~12 weekly points and the top 5 products, never raw rows.
- **One row per product per day** in a new `DailySales` table. Don't create an `Order` per CSV row.
- **Overwrite = upsert** on `(product, date)`. Rows in the file replace matching rows; everything else stays. Within one file, the last row for a product+date wins.
- **Upserts are idempotent**, so re-uploading the same file gives the same result. That's why it's fine to commit per chunk (100k rows) instead of one giant transaction. A failed import can be retried, and progress is visible while it runs. (With a single transaction, the polling request couldn't see `rows_processed` change until the very end.)
- **"Last week" is the last complete week in the data, not today.** The Kaggle data ends in 2017, and if you anchor to today, every chart is empty.

---

## Step 1: Product model fixes

`name` is `max_length=20`, which real product names will exceed. Products are matched by name during import, so `(business, name)` must be unique.

```python
# apps/products/models.py
class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    ...

    class Meta:
        constraints = [
            ...,
            models.UniqueConstraint(fields=["business", "name"], name="product_business_name_uniq"),
        ]
```

Check for existing duplicates before migrating:
`Product.objects.values("business", "name").annotate(n=Count("id")).filter(n__gt=1)`

Expose the SKU so search results and the sidebar can show it:

```python
# apps/products/serializers.py
fields = ["id", "name", "category", "price", "current_stock", "stock_keeping_unit", "created_at", "updated_at"]
```

Search by name or SKU, with stable ordering (pagination needs it):

```python
# apps/products/services.py
def search_products_by_name(self, business, query):
    return (
        Product.objects.filter(business=business)
        .filter(Q(name__icontains=query) | Q(stock_keeping_unit__icontains=query))
        .order_by("name")
    )
```

`icontains` does a full scan. That's fine up to ~100k products. Past that, add a
trigram index (`django.contrib.postgres`, `GinIndex(OpClass(Upper("name"), name="gin_trgm_ops"))`).

## Step 2: `DailySales` model (apps/sales/models.py)

```python
class DailySales(models.Model):
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="daily_sales")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="daily_sales")
    date = models.DateField()
    units = models.PositiveIntegerField()
    revenue = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "date"], name="daily_sales_product_date_uniq"),
        ]
        indexes = [
            models.Index(fields=["business", "date"]),
        ]
```

The unique constraint creates a `(product, date)` index. That covers the
per-product queries, and `(business, date)` covers the overview queries.

## Step 3: `ImportJob` model (apps/sales/models.py)

```python
class ImportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        RUNNING = "running"
        DONE = "done"
        FAILED = "failed"

    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="import_jobs")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    rows_processed = models.PositiveIntegerField(default=0)
    rows_written = models.PositiveIntegerField(default=0)
    rows_skipped = models.PositiveIntegerField(default=0)
    products_created = models.PositiveIntegerField(default=0)
    row_errors = models.JSONField(default=list)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
```

```python
# apps/sales/serializers.py
class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportJob
        fields = [
            "id", "status", "file_name", "rows_processed", "rows_written", "rows_skipped",
            "products_created", "row_errors", "error", "created_at", "finished_at",
        ]
```

## Step 4: Import service (apps/sales/imports.py)

pandas reads the file in 100k-row chunks, so memory use stays flat no matter
how big the file is. Every value is read as a string (`dtype=str`) and converted
with `errors="coerce"`, so bad values become `NaN`/`NaT`, and those rows get
skipped and reported instead of crashing the import.

```python
import logging
import os
import threading
from decimal import Decimal

import pandas as pd
from django.db import connection, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.products.models import Product
from .models import DailySales, ImportJob

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ["date", "product", "units", "revenue"]
CHUNK_ROWS = 100_000
MAX_ROW_ERRORS = 20
NEW_PRODUCT_CATEGORY = "Imported"


class ImportFailed(Exception):
    pass


class SalesImportService:
    def __init__(self, job: ImportJob):
        self.job = job
        self.business = job.business
        self.product_ids: dict[str, int] = {}
        self.touched_products: set[int] = set()

    def run(self):
        job = self.job
        job.status = ImportJob.Status.RUNNING
        job.save(update_fields=["status"])
        try:
            self._check_header()
            reader = pd.read_csv(
                job.file_path,
                dtype=str,
                chunksize=CHUNK_ROWS,
                encoding="utf-8-sig",
                usecols=lambda c: c.strip().lower() in REQUIRED_COLUMNS,
            )
            first_row = 1
            for chunk in reader:
                self._import_chunk(chunk, first_row)
                first_row += len(chunk)
            self._refresh_product_prices()
            job.status = ImportJob.Status.DONE
        except ImportFailed as exc:
            job.status, job.error = ImportJob.Status.FAILED, str(exc)
        except Exception:
            logger.exception("Sales import %s crashed", job.id)
            job.status, job.error = ImportJob.Status.FAILED, "Unexpected error while importing. Nothing after the last progress update was saved."
        finally:
            job.finished_at = timezone.now()
            job.save()
            if os.path.exists(job.file_path):
                os.remove(job.file_path)

    def _check_header(self):
        try:
            header = pd.read_csv(self.job.file_path, nrows=0, encoding="utf-8-sig").columns
        except (pd.errors.ParserError, UnicodeDecodeError, pd.errors.EmptyDataError):
            raise ImportFailed("The file is not a readable UTF-8 CSV.")
        missing = set(REQUIRED_COLUMNS) - {c.strip().lower() for c in header}
        if missing:
            raise ImportFailed(f"Missing required columns: {', '.join(sorted(missing))}")

    def _import_chunk(self, chunk: pd.DataFrame, first_row: int):
        valid, invalid = self._clean(chunk, first_row)
        valid = valid.drop_duplicates(subset=["product", "date"], keep="last")

        with transaction.atomic():
            ids = self._resolve_products(valid["product"].unique())
            objects = [
                DailySales(
                    business=self.business,
                    product_id=ids[row.product],
                    date=row.date.date(),
                    units=int(row.units),
                    revenue=Decimal(f"{row.revenue:.2f}"),
                )
                for row in valid.itertuples(index=False)
            ]
            DailySales.objects.bulk_create(
                objects,
                batch_size=5_000,
                update_conflicts=True,
                unique_fields=["product", "date"],
                update_fields=["units", "revenue"],
            )

        self.touched_products.update(ids[name] for name in valid["product"].unique())
        job = self.job
        job.rows_processed += len(chunk)
        job.rows_written += len(objects)
        job.rows_skipped += len(invalid)
        room = MAX_ROW_ERRORS - len(job.row_errors)
        if room > 0:
            job.row_errors += [f"Row {r.row}: {r.reason}" for r in invalid.head(room).itertuples()]
        job.save(update_fields=["rows_processed", "rows_written", "rows_skipped", "row_errors", "products_created"])

    def _clean(self, chunk: pd.DataFrame, first_row: int):
        chunk = chunk.rename(columns=lambda c: c.strip().lower())
        df = pd.DataFrame({
            "row": range(first_row, first_row + len(chunk)),
            "date": pd.to_datetime(chunk["date"].str.strip(), format="%Y-%m-%d", errors="coerce"),
            "product": chunk["product"].str.strip(),
            "units": pd.to_numeric(chunk["units"], errors="coerce"),
            "revenue": pd.to_numeric(chunk["revenue"], errors="coerce"),
        })

        reason = pd.Series("", index=df.index)
        reason[df["date"].isna()] = "invalid date (expected YYYY-MM-DD)"
        reason[df["product"].isna() | (df["product"] == "")] = "product is empty"
        reason[df["product"].str.len() > 255] = "product name longer than 255 characters"
        reason[df["units"].isna() | (df["units"] < 0) | (df["units"] % 1 != 0)] = "units must be a whole number >= 0"
        reason[df["revenue"].isna() | (df["revenue"] < 0)] = "revenue must be a number >= 0"

        bad = reason != ""
        return df[~bad], df[bad].assign(reason=reason[bad])

    def _resolve_products(self, names) -> dict[str, int]:
        new_names = [n for n in names if n not in self.product_ids]
        if new_names:
            existing = dict(
                Product.objects.filter(business=self.business, name__in=new_names).values_list("name", "id")
            )
            missing = [n for n in new_names if n not in existing]
            if missing:
                Product.objects.bulk_create(
                    [
                        Product(business=self.business, name=n, category=NEW_PRODUCT_CATEGORY, price=0, current_stock=0)
                        for n in missing
                    ],
                    batch_size=1_000,
                    ignore_conflicts=True,
                )
                existing.update(
                    Product.objects.filter(business=self.business, name__in=missing).values_list("name", "id")
                )
                self.job.products_created += len(missing)
            self.product_ids.update(existing)
        return self.product_ids

    def _refresh_product_prices(self):
        stats = (
            DailySales.objects.filter(product_id__in=self.touched_products)
            .values("product_id")
            .annotate(units=Sum("units"), revenue=Sum("revenue"))
        )
        updates = [
            Product(id=s["product_id"], price=(s["revenue"] / s["units"]).quantize(Decimal("0.01")))
            for s in stats
            if s["units"]
        ]
        Product.objects.bulk_update(updates, ["price"], batch_size=1_000)


def start_import_in_background(job_id: int):
    def target():
        try:
            job = ImportJob.objects.select_related("business").get(pk=job_id)
            SalesImportService(job).run()
        finally:
            connection.close()

    threading.Thread(target=target, daemon=True).start()
```

Notes:
- `product_price` (step 7) comes from `_refresh_product_prices`: the average revenue per unit across all the product's sales.
- `connection.close()` matters. Every thread gets its own DB connection, and without closing it you leak one per import.
- **Thread limits:** the job dies if the server restarts mid-import (it stays `running` forever), and with several gunicorn workers each one runs its own threads. That's fine for now. When you need more, move `SalesImportService(job).run()` into a Celery task, or the Django 6 `@task` framework with the `django-tasks` DB backend. The service class doesn't change, only the trigger.
- A cleanup for stuck jobs: on startup or in a management command, mark `running` jobs older than 1 hour as `failed`.
- **Faster path for 10M+ rows:** `COPY` into a temp table, then one `INSERT ... SELECT ... ON CONFLICT (product_id, date) DO UPDATE`. That's 5–10× faster than `bulk_create`. Only worth it if imports feel slow.

## Step 5: Upload endpoint (apps/sales/viewsets.py)

```python
import uuid
from pathlib import Path

from django.conf import settings
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.products.permissions import HasActiveBusiness
from .imports import start_import_in_background
from .models import ImportJob
from .serializers import ImportJobSerializer


def get_active_business(user):
    business_user = user.businessuser_set.filter(is_active=True).select_related("business").first()
    if not business_user:
        raise PermissionDenied("User has no active business")
    return business_user.business


class SalesImportViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasActiveBusiness]
    serializer_class = ImportJobSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        return ImportJob.objects.filter(business=get_active_business(self.request.user))

    def create(self, request):
        business = get_active_business(request.user)
        upload = request.FILES.get("file")

        if upload is None:
            raise ValidationError({"file": ["No file was uploaded."]})
        if not upload.name.lower().endswith(".csv"):
            raise ValidationError({"file": ["Only .csv files are supported."]})
        if upload.size > settings.SALES_IMPORT_MAX_BYTES:
            raise ValidationError({"file": ["The file is larger than 200 MB."]})
        if ImportJob.objects.filter(
            business=business, status__in=[ImportJob.Status.PENDING, ImportJob.Status.RUNNING]
        ).exists():
            return Response(
                {"detail": "Another import is still running. Wait for it to finish."},
                status=status.HTTP_409_CONFLICT,
            )

        import_dir = Path(settings.SALES_IMPORT_DIR)
        import_dir.mkdir(parents=True, exist_ok=True)
        path = import_dir / f"{uuid.uuid4()}.csv"
        with path.open("wb") as out:
            for part in upload.chunks():
                out.write(part)

        job = ImportJob.objects.create(
            business=business,
            created_by=request.user,
            file_name=upload.name[:255],
            file_path=str(path),
        )
        transaction.on_commit(lambda: start_import_in_background(job.id))
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
```

```python
# apps/sales/urls.py
router.register(r"imports", SalesImportViewSet, basename="sales-imports")
```

```python
# config/settings/base.py
SALES_IMPORT_MAX_BYTES = 200 * 1024 * 1024
SALES_IMPORT_DIR = BASE_DIR / "var" / "imports"
```

Add `var/` to `.gitignore`. Django streams uploads over 2.5 MB to a temp file
(`FILE_UPLOAD_MAX_MEMORY_SIZE`), so a 200 MB upload never sits in RAM.
`DATA_UPLOAD_MAX_MEMORY_SIZE` doesn't apply to files. In production, nginx
needs `client_max_body_size 200m;`, otherwise it rejects the upload with 413
before Django sees it. The frontend already shows a message for 413.

Why save the file yourself? `request.FILES` temp files are deleted when the
request ends, and the import runs after that.

## Step 6: Analytics endpoints (apps/analytics/)

```python
# apps/analytics/services.py
from datetime import date, timedelta

from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.db.models.functions import TruncWeek
from rest_framework.exceptions import NotFound

from apps.forecasting.models import ForecastResult
from apps.products.models import Product
from apps.sales.models import DailySales

WEEK = timedelta(days=7)


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def last_complete_week(latest: date) -> date:
    return monday(latest + timedelta(days=1) - WEEK)


class AnalyticsService:
    def __init__(self, business, product_id: int | None):
        if product_id is not None and not Product.objects.filter(id=product_id, business=business).exists():
            raise NotFound("Product not found.")
        self.business = business
        self.product_id = product_id

    def sales(self):
        qs = DailySales.objects.filter(business=self.business)
        return qs.filter(product_id=self.product_id) if self.product_id else qs

    def latest_date(self) -> date | None:
        return self.sales().aggregate(d=Max("date"))["d"]

    def summary(self) -> dict:
        qs = self.sales()
        agg = qs.aggregate(
            units=Sum("units"), revenue=Sum("revenue"), first=Min("date"), last=Max("date"),
            products=Count("product_id", distinct=True),
        )
        if agg["last"] is None:
            return {
                "has_data": False, "product_count": 0, "total_units": 0, "total_revenue": 0,
                "date_from": None, "date_to": None, "last_week_units": 0,
                "previous_week_units": 0, "avg_unit_price": None,
            }

        week = last_complete_week(agg["last"])
        weeks = qs.filter(date__gte=week - WEEK, date__lt=week + WEEK).aggregate(
            last=Sum("units", filter=Q(date__gte=week)),
            previous=Sum("units", filter=Q(date__lt=week)),
        )
        units, revenue = agg["units"] or 0, float(agg["revenue"] or 0)
        return {
            "has_data": True,
            "product_count": agg["products"],
            "total_units": units,
            "total_revenue": revenue,
            "date_from": agg["first"],
            "date_to": agg["last"],
            "last_week_units": weeks["last"] or 0,
            "previous_week_units": weeks["previous"] or 0,
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
            .annotate(units=Sum("units"), revenue=Sum("revenue"))
        )
        by_week = {r["week"]: r for r in rows}
        series = []
        for i in range(weeks):
            week = start + i * WEEK
            row = by_week.get(week)
            series.append({
                "week_start": week,
                "units": row["units"] if row else 0,
                "revenue": float(row["revenue"]) if row else 0.0,
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
        confidence = (
            sum(float(f.confidence_score) * f.predicted_quantity for f in latest) / predicted
            if predicted else 0.0
        )
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

        per_product = qs.values("product_id", "product__name", "product__stock_keeping_unit").annotate(
            units=Sum("units"), revenue=Sum("revenue")
        )
        top = list(per_product.order_by(f"-{order_by}", "product_id")[:limit])
        totals = qs.aggregate(units=Sum("units"), revenue=Sum("revenue"), products=Count("product_id", distinct=True))

        total_units, total_revenue = totals["units"] or 0, float(totals["revenue"] or 0)
        top_units = sum(p["units"] for p in top)
        top_revenue = sum(float(p["revenue"]) for p in top)
        return {
            "items": [
                {
                    "id": p["product_id"],
                    "name": p["product__name"],
                    "sku": p["product__stock_keeping_unit"],
                    "units": p["units"],
                    "revenue": float(p["revenue"]),
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
```

`distinct("product_id")` is Postgres-only (`DISTINCT ON`), and you're on Postgres.
`week_start` on `ForecastResult` is added in step 7.

```python
# apps/analytics/views.py
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.permissions import HasActiveBusiness
from apps.sales.viewsets import get_active_business
from .services import AnalyticsService


class AnalyticsParams(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, min_value=1)
    weeks = serializers.IntegerField(required=False, min_value=1, max_value=104)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50, default=5)
    order_by = serializers.ChoiceField(choices=["units", "revenue"], required=False, default="revenue")


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated, HasActiveBusiness]

    def service_and_params(self, request):
        params = AnalyticsParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        business = get_active_business(request.user)
        return AnalyticsService(business, data.get("product_id")), data


class SummaryView(AnalyticsView):
    def get(self, request):
        service, _ = self.service_and_params(request)
        return Response(service.summary())


class TimelineView(AnalyticsView):
    def get(self, request):
        service, params = self.service_and_params(request)
        return Response(service.timeline(params.get("weeks", 12)))


class TopProductsView(AnalyticsView):
    def get(self, request):
        service, params = self.service_and_params(request)
        return Response(service.top_products(params["limit"], params.get("weeks"), params["order_by"]))
```

```python
# apps/analytics/urls.py
from django.urls import path
from .views import SummaryView, TimelineView, TopProductsView

urlpatterns = [
    path("summary/", SummaryView.as_view()),
    path("timeline/", TimelineView.as_view()),
    path("top-products/", TopProductsView.as_view()),
]

# config/urls.py
path("api/analytics/", include("apps.analytics.urls")),
```

The top-products service ignores `product_id`, which is right: it's always
business-wide. DRF renders `date` objects as `"YYYY-MM-DD"`, which is what the
frontend expects.

**Performance:** with 1M rows, these are indexed aggregates that take roughly
50–300 ms. If the overview gets slow at 10M+ rows, add a `WeeklySales` table
that the import fills at the end, and point the analytics queries at it. The
views and the frontend don't change.

## Step 7: Forecasting on imported data

Today, `_fetch_sales_data` reads `OrderLine` for **all businesses** and uses
`as_of=today`. With 2017 data, `to_weekly` would fill every week from 2017 to
today with zeros, and the forecast would come out ~0. Forecast per business,
anchored to the last date in the data:

```python
# apps/forecasting/models.py  (add field + migration)
week_start = models.DateField(null=True, blank=True)
```

```python
# apps/forecasting/services.py
@classmethod
def run_for_business(cls, business) -> int:
    daily = cls._fetch_sales_data(business)
    if daily.empty:
        return 0
    as_of = pd.Timestamp(daily["date"].max()) + pd.Timedelta(days=1)
    output = ml.forecast(daily, as_of=as_of)
    if output.predictions.empty:
        return 0
    return cls._save_predictions(output.predictions)

@staticmethod
def _fetch_sales_data(business):
    rows = (
        DailySales.objects.filter(business=business)
        .values_list("product_id", "date", "units")
        .iterator(chunk_size=50_000)
    )
    return pd.DataFrame.from_records(rows, columns=["series_id", "date", "quantity"])

@staticmethod
def _save_predictions(predictions) -> int:
    forecasts = [
        ForecastResult(
            product_id=int(row.series_id),
            week_start=row.week_start.date(),
            ...,  # same fields as today
        )
        for row in predictions.itertuples()
    ]
    with transaction.atomic():
        ForecastResult.objects.bulk_create(forecasts, batch_size=1_000)
    return len(forecasts)
```

Check that `ml.forecast`'s future rows have `week_start` = the Monday after the
last complete week. That's what `AnalyticsService.forecast_for(end + WEEK)` looks up.

```python
# apps/forecasting/viewsets.py
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied

def get_business(self, request):
    business_user = request.user.businessuser_set.filter(is_active=True).first()
    if not business_user:
        raise PermissionDenied("User has no active business")
    return business_user.business

@action(detail=False, methods=["post"], url_path="run")
def run(self, request):
    created = ForecastingService.run_for_business(self.get_business(request))
    return Response({"forecasts_created": created})
```

(`get_business` currently raises `ValueError`, which becomes a 500. `PermissionDenied` gives a 403.)

```python
# apps/forecasting/serializers.py
product_name = serializers.CharField(source="product.name", read_only=True)
product_sku = serializers.CharField(source="product.stock_keeping_unit", read_only=True, allow_null=True)
product_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)
# add the three names to Meta.fields

def get_target_date(self, obj):
    if obj.week_start:
        return obj.week_start.isoformat()
    ...  # existing fallback
```

Add `.select_related("product")` to both queries in `ForecastingService`
(`get_latest_forecast_for_product`, `get_latest_n_forecasts`). Otherwise the
new fields cause one query per row.

The run is synchronous. LightGBM on ~1,000 products takes seconds. If it gets
past ~20 s, move it to the same background pattern as the import.

Optional: make checkout (`SalesService.process_checkout`) also upsert into
`DailySales` with `F("units") + qty`, so till sales and imported sales feed the
same model.

## Step 8: Tests (~250 lines)

Use a small temp CSV per test (`tmp_path` / `tempfile`) and call
`SalesImportService(job).run()` directly. Don't go through the thread.

1. A valid file creates products and `DailySales` rows, and the counts on the job match.
2. **Overwrite:** import A, then B with one overlapping product+date. The overlap has B's values and the rest of A is still there.
3. Duplicate product+date in one file: the last row wins.
4. Bad rows (bad date, `-1` units, `1,5` revenue, empty product) are skipped with readable `row_errors`, and good rows are still imported.
5. A missing column fails the job with "Missing required columns: revenue", and nothing is written.
6. The temp file is deleted on success and on failure.
7. Upload endpoint: 400 for no file / wrong extension, 409 while a job is running, 202 + job JSON, and another business's job returns 404.
8. Summary/timeline: weeks without sales come back as 0, and "last week" is anchored to the data, not today.
9. Top products: `other` = total − top N, and `limit`/`order_by` validation returns 400.

```python
def test_overwrite_keeps_unrelated_rows(business, tmp_path):
    write_csv(tmp_path / "a.csv", [
        ("2017-01-01", "Mug", 10, "99.90"),
        ("2017-01-02", "Mug", 5, "49.95"),
    ])
    run_import(business, tmp_path / "a.csv")

    write_csv(tmp_path / "b.csv", [("2017-01-02", "Mug", 7, "69.93")])
    run_import(business, tmp_path / "b.csv")

    rows = dict(DailySales.objects.filter(business=business).values_list("date", "units"))
    assert rows == {date(2017, 1, 1): 10, date(2017, 1, 2): 7}
```

## Order of work

1. Steps 1–3: models + migrations.
2. Step 4 with tests 1–6. This is the core, so get it right before any HTTP.
3. Step 5: the upload works end to end in the UI (you'll see progress, then an empty dashboard).
4. Step 6: the dashboard comes alive.
5. Step 7: the Run forecast button works.

You can test with `sales_example.csv` on your Desktop (3,650 rows). For a
million-row stress test, generate one from `dataset/train.csv` (913k rows): map
`item` to a name and compute `revenue = sales * price`.
