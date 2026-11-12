import logging
import os
import threading
from datetime import timedelta
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
LOOKUP_BATCH = 10_000
MAX_ROW_ERRORS = 20
MAX_NAME_LENGTH = 255
MAX_UNITS = 2_147_483_647
NEW_PRODUCT_CATEGORY = "Imported"
STALE_AFTER = timedelta(hours=1)
ACTIVE_STATUSES = [ImportJob.Status.PENDING, ImportJob.Status.RUNNING]


class ImportFailed(Exception):
    pass


def batched(items, size):
    for start in range(0, len(items), size):
        yield items[start:start + size]


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
            first_line = 2
            for chunk in self._read_chunks():
                self._import_chunk(chunk, first_line)
                first_line += len(chunk)
            self._refresh_product_prices()
            job.status = ImportJob.Status.DONE
        except ImportFailed as exc:
            job.status = ImportJob.Status.FAILED
            job.error = str(exc)
        except Exception:
            logger.exception("Sales import %s crashed", job.id)
            job.status = ImportJob.Status.FAILED
            job.error = "Unexpected error while importing. Rows before the failure were saved; re-upload the file to retry."
        finally:
            job.finished_at = timezone.now()
            job.save()
            if os.path.exists(job.file_path):
                os.remove(job.file_path)

    def _read_csv(self, **options):
        return pd.read_csv(
            self.job.file_path,
            dtype=str,
            encoding="utf-8-sig",
            keep_default_na=False,
            na_filter=False,
            **options,
        )

    def _check_header(self):
        try:
            header = self._read_csv(nrows=0).columns
        except (UnicodeDecodeError, pd.errors.ParserError, pd.errors.EmptyDataError):
            raise ImportFailed("The file is not a readable UTF-8 CSV.")
        missing = set(REQUIRED_COLUMNS) - {str(c).strip().lower() for c in header}
        if missing:
            raise ImportFailed(f"Missing required columns: {', '.join(sorted(missing))}")

    def _read_chunks(self):
        reader = self._read_csv(
            chunksize=CHUNK_ROWS,
            usecols=lambda c: str(c).strip().lower() in REQUIRED_COLUMNS,
        )
        try:
            yield from reader
        except UnicodeDecodeError:
            raise ImportFailed("The file contains characters that are not valid UTF-8.")
        except pd.errors.ParserError as exc:
            raise ImportFailed(f"The CSV is malformed: {exc}")

    def _import_chunk(self, chunk: pd.DataFrame, first_line: int):
        valid, invalid = clean_chunk(chunk, first_line)
        valid = valid.drop_duplicates(subset=["product", "date"], keep="last")
        names = valid["product"].unique().tolist()

        with transaction.atomic():
            ids = self._resolve_products(names)
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

        self.touched_products.update(ids[name] for name in names)
        job = self.job
        job.rows_processed += len(chunk)
        job.rows_written += len(objects)
        job.rows_skipped += len(invalid)
        room = MAX_ROW_ERRORS - len(job.row_errors)
        if room > 0:
            job.row_errors = job.row_errors + [
                f"Line {row.line}: {row.reason}" for row in invalid.head(room).itertuples(index=False)
            ]
        job.save(update_fields=["rows_processed", "rows_written", "rows_skipped", "row_errors", "products_created"])

    def _resolve_products(self, names) -> dict[str, int]:
        new_names = [name for name in names if name not in self.product_ids]
        for batch in batched(new_names, LOOKUP_BATCH):
            existing = dict(
                Product.objects.filter(business=self.business, name__in=batch).values_list("name", "id")
            )
            missing = [name for name in batch if name not in existing]
            if missing:
                Product.objects.bulk_create(
                    [
                        Product(
                            business=self.business,
                            name=name,
                            category=NEW_PRODUCT_CATEGORY,
                            price=0,
                            current_stock=0,
                        )
                        for name in missing
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
        updates = []
        for batch in batched(list(self.touched_products), LOOKUP_BATCH):
            stats = (
                DailySales.objects.filter(product_id__in=batch)
                .values("product_id")
                .annotate(total_units=Sum("units"), total_revenue=Sum("revenue"))
            )
            updates += [
                Product(id=s["product_id"], price=(s["total_revenue"] / s["total_units"]).quantize(Decimal("0.01")))
                for s in stats
                if s["total_units"]
            ]
        Product.objects.bulk_update(updates, ["price"], batch_size=1_000)


def clean_chunk(chunk: pd.DataFrame, first_line: int):
    chunk = chunk.rename(columns=lambda c: str(c).strip().lower())
    products = chunk["product"].str.strip()
    df = pd.DataFrame({
        "line": range(first_line, first_line + len(chunk)),
        "date": pd.to_datetime(chunk["date"].str.strip(), format="%Y-%m-%d", errors="coerce"),
        "product": products,
        "units": pd.to_numeric(chunk["units"].str.strip(), errors="coerce"),
        "revenue": pd.to_numeric(chunk["revenue"].str.strip(), errors="coerce"),
    }, index=chunk.index)

    reason = pd.Series("", index=df.index)
    reason[df["revenue"].isna() | (df["revenue"] < 0)] = "revenue must be a number >= 0 (use a dot for decimals)"
    bad_units = df["units"].isna() | (df["units"] < 0) | (df["units"] % 1 != 0) | (df["units"] > MAX_UNITS)
    reason[bad_units] = "units must be a whole number >= 0"
    reason[products.str.len() > MAX_NAME_LENGTH] = f"product name is longer than {MAX_NAME_LENGTH} characters"
    reason[products == ""] = "product is empty"
    reason[df["date"].isna()] = "date must look like YYYY-MM-DD"

    bad = reason != ""
    return df[~bad], df[bad].assign(reason=reason[bad])


def expire_stale_jobs(business):
    ImportJob.objects.filter(
        business=business,
        status__in=ACTIVE_STATUSES,
        created_at__lt=timezone.now() - STALE_AFTER,
    ).update(
        status=ImportJob.Status.FAILED,
        error="The import was interrupted (server restart?). Re-upload the file to retry.",
        finished_at=timezone.now(),
    )


def start_import_in_background(job_id: int):
    def target():
        try:
            job = ImportJob.objects.select_related("business").get(pk=job_id)
            SalesImportService(job).run()
        except Exception:
            logger.exception("Could not run sales import %s", job_id)
        finally:
            connection.close()

    threading.Thread(target=target, name=f"sales-import-{job_id}", daemon=True).start()
