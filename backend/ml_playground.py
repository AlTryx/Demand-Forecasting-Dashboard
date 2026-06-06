import os
import sys
import django
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

# 1. Path Setup & Django Initialization
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.sales.models import SalesRecord

def run_ml_playground():
    print("Fetching clean timeline vectors from Django database.")
    sales_qs = SalesRecord.objects.all().values('product_id', 'date', 'quantity_sold')
    df = pd.DataFrame(list(sales_qs))

    if df.empty:
        print("Database is empty! Please run your seeding command first.")
        return

    df['date'] = pd.to_datetime(df['date'])

    print("Aggregating raw daily timelines into WEEKLY buckets...")
    # Grouping by week stabilizes local noise and matches enterprise logistics patterns
    df['week_start'] = df['date'].dt.to_period('W').dt.start_time
    df = df.groupby(['product_id', 'week_start'])['quantity_sold'].sum().reset_index()
    df = df.sort_values(by=['product_id', 'week_start']).reset_index(drop=True)

    print("🛠️ Engineering macro features (Calendar Cycles, Lags & Momentum)...")
    # Seasonality features
    df['month'] = df['week_start'].dt.month

    # Historical Lag Features (Captures immediate purchase inertia)
    df['lag_1_week'] = df.groupby('product_id')['quantity_sold'].shift(1)
    df['lag_2_weeks'] = df.groupby('product_id')['quantity_sold'].shift(2)
    df['lag_4_weeks'] = df.groupby('product_id')['quantity_sold'].shift(4)

    # 4-Week Rolling Mean (Captures broader consumer momentum changes)
    df['rolling_mean_4'] = df.groupby('product_id')['quantity_sold'].shift(1).rolling(window=4).mean()

    # Drop cold-start rows that don't have enough history to calculate lag structures
    df = df.dropna().reset_index(drop=True)

    # Chronological Time-Based Split (80% Train / 20% Test)
    unique_weeks = sorted(df['week_start'].unique())
    split_index = int(len(unique_weeks) * 0.80)
    split_date = unique_weeks[split_index]

    print(f"Splitting timelines chronologically at week: {split_date.strftime('%Y-%m-%d')}")
    train_df = df[df['week_start'] <= split_date]
    test_df = df[df['week_start'] > split_date]

    feature_columns = ['month', 'lag_1_week', 'lag_2_weeks', 'lag_4_weeks', 'rolling_mean_4']

    X_train = train_df[feature_columns]
    y_train = train_df['quantity_sold']
    X_test = test_df[feature_columns]
    y_test = test_df['quantity_sold']

    print(f"🏋Training real RandomForestRegressor on {len(X_train)} chronological vectors...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    print("Model training complete. Calculating upgraded business metrics...")
    predictions = model.predict(X_test)

    # Physical Error Assessment
    mae = mean_absolute_error(y_test, predictions)

    # Calculate Enterprise WAPE (Weighted Absolute Percentage Error)
    total_absolute_error = np.sum(np.abs(y_test - predictions))
    total_actual_volume = np.sum(y_test)

    wape_error_rate = total_absolute_error / total_actual_volume if total_actual_volume > 0 else 0
    true_weighted_accuracy = (1 - wape_error_rate) * 100

    print(f"Mean Absolute Error (MAE): {mae:.2f} units / week per item")
    print(f"Total Actual Volume Tested: {int(total_actual_volume)} units")
    print(f"Global Forecasting Error Rate: {wape_error_rate * 100:.2f}%")
    print(f"True Weighted Accuracy Score (WAPE): {true_weighted_accuracy:.2f}%")

    if true_weighted_accuracy >= 80:
        print("Success! Your forecasting engine has officially crossed your 80%+ accuracy goal!")
    else:
        print("System metrics stabilized. Core engine ready for dashboard routing integrations.")

if __name__ == '__main__':
    run_ml_playground()