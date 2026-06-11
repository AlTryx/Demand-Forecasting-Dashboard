import datetime
import pandas as pd
import numpy as np
from django.db import transaction
from sklearn.ensemble import RandomForestRegressor
from apps.sales.models import SalesRecord
from .models import ForecastResult
from sklearn.metrics import mean_absolute_error
from rest_framework.exceptions import NotFound, ValidationError
from apps.products.models import Product

class ForecastingService:
    def get_latest_forecast_for_product(self, business, product_id):
        try:
            product = Product.objects.get(id=product_id, business=business)
        except Product.DoesNotExist:
            raise NotFound("Product not found or access denied.")
        return ForecastResult.objects.filter(product=product)

    @classmethod
    def run_prediction_pipeline(cls):
        df_raw = cls._fetch_sales_data()
        if df_raw.empty or len(df_raw) < 1000:
            print("ML - Insufficient data footprint")
            return False

        weekly_df = cls._prepare_features(df_raw)

        x_train, y_train, x_test, y_test = cls._prepare_train_test_split(weekly_df)
        model = cls._train_model(x_train, y_train)

        confidence_decimal = cls._evaluate_model(model, x_test, y_test)
        print(f"ML Engine accuracy: {confidence_decimal * 100:.2f}%")

        predictions = cls._generate_predictions(weekly_df, model, confidence_decimal)

        if predictions:
            cls._save_predictions(predictions)
        return True

    @staticmethod
    def _fetch_sales_data():
        print("ML - Fetching transactional history")
        sales_qs = SalesRecord.objects.all().values('product_id', 'date', 'quantity_sold')
        return pd.DataFrame(list(sales_qs))

    @staticmethod
    def _prepare_features(df):
        df['date'] = pd.to_datetime(df['date'])
        df['week_start'] = df['date'].dt.to_period('W').dt.start_time

        weekly_df = df.groupby(['product_id', 'week_start'])['quantity_sold'].sum().reset_index()
        weekly_df = weekly_df.sort_values(by=['product_id', 'week_start']).reset_index(drop=True)

        weekly_df['month'] = weekly_df['week_start'].dt.month

        grouped = weekly_df.groupby('product_id')['quantity_sold']
        weekly_df['lag_1_week'] = grouped.shift(1)
        weekly_df['lag_2_weeks'] = grouped.shift(2)
        weekly_df['lag_4_weeks'] = grouped.shift(4)
        weekly_df['rolling_mean_4'] = grouped.shift(1).rolling(window=4).mean()

        return weekly_df

    @staticmethod
    def _get_feature_cols():
        return ['month', 'lag_1_week', 'lag_2_weeks', 'lag_4_weeks', 'rolling_mean_4']

    @classmethod
    def _prepare_train_test_split(cls, weekly_df):
        # Drop cold-start rows that don't have enough history to calculate lag structures
        train_matrix = weekly_df.dropna().reset_index(drop=True)
        unique_weeks = sorted(train_matrix['week_start'].unique())

        split_index = int(len(unique_weeks) * 0.80)
        split_date = unique_weeks[split_index]

        train_df = train_matrix[train_matrix['week_start'] <= split_date]
        test_df = train_matrix[train_matrix['week_start'] > split_date]

        feature_columns = cls._get_feature_cols()

        x_train = train_df[feature_columns]
        y_train = train_df['quantity_sold']
        x_test = test_df[feature_columns]
        y_test = test_df['quantity_sold']

        return x_train, y_train, x_test, y_test

    @staticmethod
    def _train_model(x_train, y_train):
        print("ML - Fitting RandomForestRegressor")
        model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        model.fit(x_train, y_train)
        return model

    @classmethod
    def _evaluate_model(cls, model, x_test, y_test):
        predictions = model.predict(x_test)

        #Calculate WAPE (Weighted Absolute Percentage Error)
        total_absolute_error = np.sum(np.abs(y_test - predictions))
        total_actual_volume = np.sum(y_test)

        wape_error_rate = total_absolute_error / total_actual_volume if total_actual_volume > 0 else 0
        true_weighted_accuracy = (1 - wape_error_rate) * 100
        return round(true_weighted_accuracy / 100, 4)

    @classmethod
    def _generate_predictions(cls, weekly_df, model, confidence_decimal):
        product_service = ProductService()
        print("Saving predictions into ForecastResult model in DB")
        latest_week = weekly_df['week_start'].max()
        next_week = latest_week + datetime.timedelta(weeks=1)

        products = product_service.get_all_active_products_for_system()
        feature_cols = cls._get_feature_cols()
        forecast_instances = []

        for product in products:
            p_history = weekly_df[weekly_df['product_id'] == product.id].sort_values('week_start')
            if len(p_history) < 4:
                continue

            input_vector = pd.DataFrame([{
                'month': next_week.month,
                'lag_1_week': p_history.iloc[-1]['quantity_sold'],
                'lag_2_weeks': p_history.iloc[-2]['quantity_sold'],
                'lag_4_weeks': p_history.iloc[-4]['quantity_sold'],
                'rolling_mean_4': p_history.tail(4)['quantity_sold'].mean()
            }])

            predicted_float = model.predict(input_vector[feature_cols])[0]
            predicted_units = max(0, int(round(predicted_float)))

            forecast_instances.append(
                ForecastResult(
                    product=product,
                    predicted_quantity=predicted_units,
                    horizon=ForecastResult.HorizonOptions.ONE_WEEK,
                    confidence_score=confidence_decimal
                )
            )
        return forecast_instances

    @staticmethod
    def _save_predictions(forecast_instances):
        with transaction.atomic():
            ForecastResult.objects.bulk_create(forecast_instances)
        print(f"Saved {len(forecast_instances)} forecasts in DB")
        return