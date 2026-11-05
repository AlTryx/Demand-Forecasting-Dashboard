import csv
import shutil
import tempfile
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.products.models import Product
from apps.users.models import BusinessUser, User
from .imports import SalesImportService
from .models import DailySales, ImportJob

HEADER = ("date", "product", "units", "revenue")


class TempDirMixin:
    def make_temp_dir(self):
        path = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, path, ignore_errors=True)
        return path


class SalesImportServiceTests(TempDirMixin, TestCase):
    def setUp(self):
        self.tmp = self.make_temp_dir()
        self.business = Business.objects.create(name="Shop")

    def write_csv(self, rows, header=HEADER, name="sales.csv"):
        path = self.tmp / name
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            if header:
                writer.writerow(header)
            writer.writerows(rows)
        return path

    def run_import(self, path, business=None):
        job = ImportJob.objects.create(
            business=business or self.business,
            file_name=path.name,
            file_path=str(path),
        )
        SalesImportService(job).run()
        job.refresh_from_db()
        return job

    def sales(self):
        return {
            (row.product.name, row.date): (row.units, row.revenue)
            for row in DailySales.objects.filter(business=self.business).select_related("product")
        }

    def test_valid_file_creates_products_and_daily_rows(self):
        path = self.write_csv([
            ("2017-01-01", "Mug", 10, "99.90"),
            ("2017-01-01", "Beans", 2, "37.80"),
            ("2017-01-02", "Mug", 5, "49.95"),
        ])

        job = self.run_import(path)

        self.assertEqual(job.status, ImportJob.Status.DONE)
        self.assertEqual((job.rows_processed, job.rows_written, job.rows_skipped), (3, 3, 0))
        self.assertEqual(job.products_created, 2)
        self.assertIsNotNone(job.finished_at)
        self.assertEqual(self.sales()[("Mug", date(2017, 1, 2))], (5, Decimal("49.95")))
        mug = Product.objects.get(business=self.business, name="Mug")
        self.assertEqual(mug.price, Decimal("9.99"))
        self.assertEqual(mug.category, "Imported")

    def test_overwrite_replaces_matching_days_and_keeps_the_rest(self):
        self.run_import(self.write_csv([
            ("2017-01-01", "Mug", 10, "99.90"),
            ("2017-01-02", "Mug", 5, "49.95"),
        ], name="a.csv"))

        job = self.run_import(self.write_csv([("2017-01-02", "Mug", 7, "69.93")], name="b.csv"))

        self.assertEqual(job.products_created, 0)
        self.assertEqual(self.sales(), {
            ("Mug", date(2017, 1, 1)): (10, Decimal("99.90")),
            ("Mug", date(2017, 1, 2)): (7, Decimal("69.93")),
        })
        self.assertEqual(Product.objects.filter(business=self.business).count(), 1)

    def test_same_product_and_date_twice_in_one_file_keeps_the_last_row(self):
        job = self.run_import(self.write_csv([
            ("2017-01-01", "Mug", 1, "10.00"),
            ("2017-01-01", "Mug", 4, "40.00"),
        ]))

        self.assertEqual(job.status, ImportJob.Status.DONE)
        self.assertEqual(self.sales(), {("Mug", date(2017, 1, 1)): (4, Decimal("40.00"))})

    def test_bad_rows_are_skipped_and_reported_with_line_numbers(self):
        job = self.run_import(self.write_csv([
            ("2017-13-01", "Mug", 1, "1"),
            ("2017-01-01", "Mug", -1, "1"),
            ("2017-01-01", "Mug", 1, "1,5"),
            ("2017-01-01", "", 1, "1"),
            ("2017-01-01", "Mug", "2.5", "1"),
            ("2017-01-02", "Mug", 3, "30.00"),
        ]))

        self.assertEqual(job.status, ImportJob.Status.DONE)
        self.assertEqual((job.rows_written, job.rows_skipped), (1, 5))
        self.assertEqual(
            job.row_errors,
            [
                "Line 2: date must look like YYYY-MM-DD",
                "Line 3: units must be a whole number >= 0",
                "Line 4: revenue must be a number >= 0 (use a dot for decimals)",
                "Line 5: product is empty",
                "Line 6: units must be a whole number >= 0",
            ],
        )
        self.assertEqual(self.sales(), {("Mug", date(2017, 1, 2)): (3, Decimal("30.00"))})

    def test_missing_column_fails_and_writes_nothing(self):
        job = self.run_import(self.write_csv([("2017-01-01", "Mug", 1)], header=("date", "product", "units")))

        self.assertEqual(job.status, ImportJob.Status.FAILED)
        self.assertEqual(job.error, "Missing required columns: revenue")
        self.assertFalse(DailySales.objects.exists())

    def test_header_is_case_and_space_insensitive_and_extra_columns_are_ignored(self):
        path = self.write_csv(
            [("2017-01-01", "Mug", 2, "20.00", "Store 4")],
            header=(" Date ", "Product", "UNITS", "revenue", "store"),
        )

        job = self.run_import(path)

        self.assertEqual(job.status, ImportJob.Status.DONE)
        self.assertEqual(self.sales(), {("Mug", date(2017, 1, 1)): (2, Decimal("20.00"))})

    def test_product_called_na_is_not_treated_as_missing(self):
        job = self.run_import(self.write_csv([("2017-01-01", "NA", 2, "4.00")]))

        self.assertEqual(job.rows_written, 1)
        self.assertTrue(Product.objects.filter(business=self.business, name="NA").exists())

    def test_existing_products_of_another_business_are_not_reused(self):
        other = Business.objects.create(name="Other shop")
        Product.objects.create(name="Mug", category="X", price=1, current_stock=0, business=other)

        job = self.run_import(self.write_csv([("2017-01-01", "Mug", 1, "5.00")]))

        self.assertEqual(job.products_created, 1)
        self.assertEqual(DailySales.objects.get().product.business, self.business)

    def test_uploaded_file_is_deleted_on_success_and_on_failure(self):
        good = self.write_csv([("2017-01-01", "Mug", 1, "5.00")], name="good.csv")
        bad = self.write_csv([("x",)], header=("nope",), name="bad.csv")

        self.run_import(good)
        self.run_import(bad)

        self.assertFalse(good.exists())
        self.assertFalse(bad.exists())


class SalesImportEndpointTests(TempDirMixin, TestCase):
    url = "/api/sales/imports/"

    def setUp(self):
        self.import_dir = self.make_temp_dir()
        settings_override = override_settings(SALES_IMPORT_DIR=self.import_dir)
        settings_override.enable()
        self.addCleanup(settings_override.disable)

        self.business = Business.objects.create(name="Shop")
        self.user = make_user("owner", self.business)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def upload(self, name="sales.csv", content=b"date,product,units,revenue\n2017-01-01,Mug,1,5.00\n"):
        return self.client.post(self.url, {"file": SimpleUploadedFile(name, content)}, format="multipart")

    def test_upload_creates_a_pending_job_and_schedules_the_import(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            response = self.upload()

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["file_name"], "sales.csv")
        self.assertEqual(len(callbacks), 1)
        job = ImportJob.objects.get(pk=response.data["id"])
        self.assertEqual(job.business, self.business)
        self.assertTrue(Path(job.file_path).exists())

    def test_missing_file_is_rejected(self):
        response = self.client.post(self.url, {}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.data)

    def test_non_csv_file_is_rejected(self):
        response = self.upload(name="sales.xlsx")

        self.assertEqual(response.status_code, 400)

    @override_settings(SALES_IMPORT_MAX_BYTES=10)
    def test_too_large_file_is_rejected(self):
        response = self.upload()

        self.assertEqual(response.status_code, 400)

    def test_second_upload_while_one_is_running_is_rejected(self):
        ImportJob.objects.create(business=self.business, file_name="a.csv", file_path="x", status=ImportJob.Status.RUNNING)

        response = self.upload()

        self.assertEqual(response.status_code, 409)

    def test_stale_running_job_does_not_block_a_new_upload(self):
        stale = ImportJob.objects.create(
            business=self.business, file_name="a.csv", file_path="x", status=ImportJob.Status.RUNNING
        )
        ImportJob.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(hours=2))

        response = self.upload()

        self.assertEqual(response.status_code, 202)
        stale.refresh_from_db()
        self.assertEqual(stale.status, ImportJob.Status.FAILED)

    def test_job_status_can_be_read_back(self):
        job = ImportJob.objects.create(business=self.business, file_name="a.csv", file_path="x", rows_processed=42)

        response = self.client.get(f"{self.url}{job.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rows_processed"], 42)

    def test_job_of_another_business_is_not_visible(self):
        other = Business.objects.create(name="Other")
        job = ImportJob.objects.create(business=other, file_name="a.csv", file_path="x")

        response = self.client.get(f"{self.url}{job.id}/")

        self.assertEqual(response.status_code, 404)

    def test_anonymous_user_is_rejected(self):
        response = APIClient().post(self.url, {}, format="multipart")

        self.assertEqual(response.status_code, 401)


def make_user(username, business):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass12345!",
        first_name="Test",
        last_name="User",
    )
    BusinessUser.objects.create(user=user, business=business, role=BusinessUser.Roles.OWNER)
    return user
