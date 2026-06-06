import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.businesses.models import Business
from apps.products.models import Product
from apps.sales.models import SalesRecord
from apps.users.models import BusinessUser

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database using the real Kaggle Store Demand Dataset (train.csv)"

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help="Path to train.csv")

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        self.stdout.write(f"📖 Opening the real archive from: {csv_path}...")

        # 1. Loading the csv kaggle data
        df = pd.read_csv(csv_path)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values(by='date')

        self.stdout.write(f"✅ Successfully loaded {len(df)} transactions. Initializing...")

        with transaction.atomic():
            self.stdout.write("🗑️ Cleaning the old database data...")
            SalesRecord.objects.all().delete()
            Product.objects.all().delete()
            Business.objects.all().delete()

            base_user = User.objects.filter(is_superuser=True).first()
            if not base_user:
                base_user = User.objects.create_superuser(
                    username="admin",
                    email="admin@dashboard.com",
                    password="adminpassword123",
                    first_name="Admin",
                    last_name="User"
                )

            unique_stores = sorted(df['store'].unique())[:3]
            business_cache = {}

            for store_id in unique_stores:
                business, _ = Business.objects.get_or_create(
                    id=store_id,
                    defaults={"name": f"Магазин Network - Обект #{store_id}"}
                )

                business_user, _ = BusinessUser.objects.get_or_create(
                    user=base_user,
                    business=business,
                    defaults={"role": BusinessUser.Roles.OWNER, "is_active": True}
                )
                if not business.owner_id:
                    business.owner = business_user
                    business.save()

                business_cache[store_id] = business

            # 4. Creating of the products (Items) for every shop
            unique_items = sorted(df['item'].unique())[:20]
            product_cache = {} # Key: (store_id, item_id) -> Product object

            self.stdout.write("📦 Catalizing ...")
            for store_id in unique_stores:
                bus_obj = business_cache[store_id]
                for item_id in unique_items:
                    product, _ = Product.objects.get_or_create(
                        business=bus_obj,
                        name=f"Item ID-{item_id}",
                        defaults={
                            "category": "Basic stock",
                            "price": 19.99,
                            "current_stock": 500
                        }
                    )
                    product_cache[(store_id, item_id)] = product

            # 5. filtering the dataset
            filtered_df = df[df['store'].isin(unique_stores) & df['item'].isin(unique_items)]

            self.stdout.write(f"⚡ Packeting of {len(filtered_df)} real time chronologies...")
            sales_records_to_create = []

            for _, row in filtered_df.iterrows():
                s_id = int(row['store'])
                i_id = int(row['item'])

                product_obj = product_cache.get((s_id, i_id))
                if product_obj:
                    sales_records_to_create.append(
                        SalesRecord(
                            product=product_obj,
                            date=row['date'].date(),
                            quantity_sold=int(row['sales'])
                        )
                    )

            self.stdout.write("📥 Saving the transactions in SQLite...")
            SalesRecord.objects.bulk_create(sales_records_to_create, batch_size=10000)

        self.stdout.write(self.style.SUCCESS("🎉 Database loaded with data!"))