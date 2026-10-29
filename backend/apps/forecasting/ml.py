from dataclasses import dataclass
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor

QUANTILES = (0.1, 0.5, 0.9)

LEVEL_WINDOW = 8

MIN_HISTORY_WEEKS = 4
HOLDOUT_WEEKS = 8
MIN_TRAINING_ROWS = 200

LAGS = (1, 2, 3, 4, 52)
FEATURE_COLUMNS = [
    *(f"lag_{k}" for k in LAGS),
    "mean_4",
    "mean_12",
    "std_4",
    "std_12",
    "week_of_year",
    "month",
]

MODEL_PARAMS = {
    "n_estimators": 300,
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_child_samples": 20,
    "subsample": 0.8,
    "subsample_freq": 1,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "verbose": -1,
}

PREDICTION_COLUMNS = ["series_id", "week_start", "predicted", "lower", "upper", "confidence", "method"]

@dataclass
class BacktestReport:
    model_wape: float
    naive_wape: float
    interval_coverage: float
    series_count: int
    holdout_weeks: int
    per_series: pd.DataFrame

    def summary(self) -> str:
        return (
            f"Backtest over the last {self.holdout_weeks} weeks, {self.series_count} series: "
            f"model WAPE {self.model_wape:.1%} (accuracy {1 - self.model_wape:.1%}), "
            f"'same as last week' WAPE {self.naive_wape:.1%}, "
            f"80% interval coverage {self.interval_coverage:.1%}"
        )


@dataclass
class ForecastOutput:
    predictions: pd.DataFrame
    report: BacktestReport | None


def to_weekly(daily: pd.DataFrame, as_of=None) -> pd.DataFrame:
    if daily.empty:
        return pd.DataFrame(columns=["series_id", "week_start", "quantity"])

    dates = pd.to_datetime(daily["date"]).dt.normalize()
    as_of = dates.max() + pd.Timedelta(days=1) if as_of is None else pd.Timestamp(as_of).normalize()
    last_complete_week = _monday(as_of - pd.Timedelta(days=7))

    weekly = (
        daily.assign(week_start=dates - pd.to_timedelta(dates.dt.weekday, unit="D"))
        .groupby(["series_id", "week_start"], as_index=False)["quantity"]
        .sum()
    )
    weekly = weekly[weekly["week_start"] <= last_complete_week]
    if weekly.empty:
        return pd.DataFrame(columns=["series_id", "week_start", "quantity"])

    first_weeks = weekly.groupby("series_id")["week_start"].min()
    grid = pd.concat(
        [
            pd.DataFrame({"series_id": series_id, "week_start": pd.date_range(first, last_complete_week, freq="7D")})
            for series_id, first in first_weeks.items()
        ],
        ignore_index=True,
    )
    result = grid.merge(weekly, on=["series_id", "week_start"], how="left")
    result["quantity"] = result["quantity"].fillna(0).astype(float)
    return result.sort_values(["series_id", "week_start"]).reset_index(drop=True)


def build_features(weekly: pd.DataFrame) -> pd.DataFrame:
    last_weeks = weekly.groupby("series_id", as_index=False)["week_start"].max()
    future = last_weeks.assign(week_start=last_weeks["week_start"] + pd.Timedelta(weeks=1), quantity=np.nan)
    df = pd.concat([weekly.assign(is_future=False), future.assign(is_future=True)], ignore_index=True)
    df = df.sort_values(["series_id", "week_start"]).reset_index(drop=True)

    by_series = df.groupby("series_id")["quantity"]
    previous = by_series.shift(1)
    previous_by_series = previous.groupby(df["series_id"])

    def rolling(window, min_periods, stat):
        return previous_by_series.transform(lambda s: getattr(s.rolling(window, min_periods=min_periods), stat)())

    df["naive"] = previous
    df["level"] = rolling(LEVEL_WINDOW, MIN_HISTORY_WEEKS, "mean")
    df["scale"] = df["level"] + 1.0

    for k in LAGS:
        df[f"lag_{k}"] = by_series.shift(k) / df["scale"]
    df["mean_4"] = rolling(4, 1, "mean") / df["scale"]
    df["mean_12"] = rolling(12, MIN_HISTORY_WEEKS, "mean") / df["scale"]
    df["std_4"] = rolling(4, 2, "std") / df["scale"]
    df["std_12"] = rolling(12, MIN_HISTORY_WEEKS, "std") / df["scale"]
    df["week_of_year"] = df["week_start"].dt.isocalendar().week.astype(int)
    df["month"] = df["week_start"].dt.month
    df["target"] = df["quantity"] / df["scale"]
    return df


def backtest(features: pd.DataFrame, holdout_weeks: int = HOLDOUT_WEEKS) -> BacktestReport | None:
    labelled = _labelled_rows(features)
    weeks = np.sort(labelled["week_start"].unique())
    if len(weeks) <= holdout_weeks:
        return None

    cutoff = weeks[-holdout_weeks]
    train = labelled[labelled["week_start"] < cutoff]
    test = labelled[labelled["week_start"] >= cutoff]
    if len(train) < MIN_TRAINING_ROWS:
        return None

    p10, p50, p90 = _predict(_fit(train), test).T
    actual = test["quantity"].to_numpy()
    scored = pd.DataFrame(
        {
            "series_id": test["series_id"].to_numpy(),
            "actual": actual,
            "model_error": np.abs(actual - p50),
            "naive_error": np.abs(actual - test["naive"].to_numpy()),
        }
    )
    per_series = scored.groupby("series_id").sum()
    denominator = per_series["actual"].clip(lower=1)
    per_series = pd.DataFrame(
        {
            "wape": per_series["model_error"] / denominator,
            "naive_wape": per_series["naive_error"] / denominator,
        }
    ).reset_index()

    total_actual = max(actual.sum(), 1)
    return BacktestReport(
        model_wape=float(scored["model_error"].sum() / total_actual),
        naive_wape=float(scored["naive_error"].sum() / total_actual),
        interval_coverage=float(np.mean((actual >= p10) & (actual <= p90))),
        series_count=int(per_series.shape[0]),
        holdout_weeks=holdout_weeks,
        per_series=per_series,
    )


def evaluate(daily: pd.DataFrame, as_of=None, holdout_weeks: int = HOLDOUT_WEEKS) -> BacktestReport | None:
    weekly = to_weekly(daily, as_of)
    if weekly.empty:
        return None
    return backtest(build_features(weekly), holdout_weeks)


def forecast(daily: pd.DataFrame, as_of=None, holdout_weeks: int = HOLDOUT_WEEKS) -> ForecastOutput:
    weekly = to_weekly(daily, as_of)
    if weekly.empty:
        return ForecastOutput(pd.DataFrame(columns=PREDICTION_COLUMNS), None)

    features = build_features(weekly)
    report = backtest(features, holdout_weeks)
    future = features[features["is_future"]]

    if report is None:
        model_rows, fallback_rows = future.iloc[0:0], future
    else:
        has_history = future["level"].notna()
        model_rows, fallback_rows = future[has_history], future[~has_history]

    frames = []
    if not model_rows.empty:
        p10, p50, p90 = _predict(_fit(_labelled_rows(features)), model_rows).T
        wape = report.per_series.set_index("series_id")["wape"]
        confidence = (1 - model_rows["series_id"].map(wape)).clip(0, 1).fillna(0)
        frames.append(
            pd.DataFrame(
                {
                    "series_id": model_rows["series_id"].to_numpy(),
                    "week_start": model_rows["week_start"].to_numpy(),
                    "predicted": p50,
                    "lower": p10,
                    "upper": p90,
                    "confidence": confidence.to_numpy(),
                    "method": "lightgbm",
                }
            )
        )
    if not fallback_rows.empty:
        recent_mean = weekly.groupby("series_id")["quantity"].apply(lambda s: s.tail(MIN_HISTORY_WEEKS).mean())
        frames.append(
            pd.DataFrame(
                {
                    "series_id": fallback_rows["series_id"].to_numpy(),
                    "week_start": fallback_rows["week_start"].to_numpy(),
                    "predicted": fallback_rows["series_id"].map(recent_mean).to_numpy(),
                    "lower": np.nan,
                    "upper": np.nan,
                    "confidence": 0.0,
                    "method": "naive",
                }
            )
        )

    predictions = pd.concat(frames, ignore_index=True)[PREDICTION_COLUMNS]
    return ForecastOutput(predictions, report)


def _labelled_rows(features: pd.DataFrame) -> pd.DataFrame:
    return features[~features["is_future"] & features["level"].notna()]


def _fit(train: pd.DataFrame) -> dict[float, LGBMRegressor]:
    models = {}
    for q in QUANTILES:
        model = LGBMRegressor(objective="quantile", alpha=q, **MODEL_PARAMS)
        model.fit(train[FEATURE_COLUMNS], train["target"])
        models[q] = model
    return models


def _predict(models: dict[float, LGBMRegressor], rows: pd.DataFrame) -> np.ndarray:
    ratios = np.column_stack([models[q].predict(rows[FEATURE_COLUMNS]) for q in QUANTILES])
    units = np.sort(ratios, axis=1) * rows["scale"].to_numpy()[:, None]
    return np.clip(units, 0, None)


def _monday(day: pd.Timestamp) -> pd.Timestamp:
    return day.normalize() - pd.Timedelta(days=day.weekday())
