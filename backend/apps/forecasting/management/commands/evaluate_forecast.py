import pandas as pd
from django.core.management.base import BaseCommand, CommandError

from apps.forecasting import ml
from apps.forecasting.services import ForecastingService


class Command(BaseCommand):
    help = (
        "Backtest the forecasting model on the last weeks of sales and compare it "
        "with 'same as last week'. Reads the sales in the database, or a Kaggle-format "
        "CSV (date,store,item,sales) with --csv. Writes nothing."
    )

    def add_arguments(self, parser):
        parser.add_argument("--csv", help="Kaggle Store Item Demand CSV, e.g. dataset/train.csv")
        parser.add_argument("--stores", type=int, help="Use only the first N stores of the CSV")
        parser.add_argument("--items", type=int, help="Use only the first N items of the CSV")
        parser.add_argument("--holdout-weeks", type=int, default=ml.HOLDOUT_WEEKS)

    def handle(self, *args, **options):
        daily = self._read_csv(options) if options["csv"] else ForecastingService._fetch_sales_data()

        report = ml.evaluate(daily, holdout_weeks=options["holdout_weeks"])
        if report is None:
            raise CommandError("Not enough sales history to backtest the model.")

        self.stdout.write(report.summary())
        worst = report.per_series.sort_values("wape", ascending=False).head(5)
        self.stdout.write("Least accurate series:")
        for row in worst.itertuples():
            self.stdout.write(f"  {row.series_id}: WAPE {row.wape:.1%} (naive {row.naive_wape:.1%})")

    @staticmethod
    def _read_csv(options):
        try:
            raw = pd.read_csv(options["csv"], usecols=["date", "store", "item", "sales"])
        except (OSError, ValueError) as error:
            raise CommandError(f"Could not read {options['csv']}: {error}")

        if options["stores"]:
            raw = raw[raw["store"].isin(sorted(raw["store"].unique())[: options["stores"]])]
        if options["items"]:
            raw = raw[raw["item"].isin(sorted(raw["item"].unique())[: options["items"]])]

        return pd.DataFrame(
            {
                "series_id": raw["store"].astype(str) + "-" + raw["item"].astype(str),
                "date": raw["date"],
                "quantity": raw["sales"],
            }
        )
