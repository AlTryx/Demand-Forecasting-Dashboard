import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.businesses.models import Business
from apps.products.models import Product
from apps.sales.models import Order, OrderLine
from apps.users.models import BusinessUser

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database using the real Kaggle Store Demand Dataset (train.csv)"

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help="Path to train.csv")

    def handle(self, *args, **options):
        csv_path = options['csv_path']

        # Loading the csv kaggle data
        df = pd.read_csv(csv_path)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values(by='date')

        self.stdout.write(f"Successfully loaded {len(df)} transactions")

        with transaction.atomic():
            Order.objects.all().delete()
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

            self.stdout.write(f"Packeting of {len(filtered_df)} real time chronologies")
            orders_to_create = []
            order_lines_to_create = []

            for index, row in filtered_df.iterrows():
                store_id = int(row['store'])
                item_id = int(row['item'])
                row_date = (row['date']).to_pydatetime()

                business_obj = business_cache.get(store_id)
                product_obj = product_cache.get((store_id, item_id))
                if business_obj and product:
                    order = Order(
                        business=business_obj,
                        created_at=row_date,
                        payment_method=Order.PaymentMethods.CARD
                    )
                    orders_to_create.append(order)
                    order._temp_product = product_obj
                    order._temp_quantity = int(row['sales'])

            self.stdout.write("Saving the Order items")
            saved_orders = Order.objects.bulk_create(orders_to_create, batch_size=5000)

            self.stdout.write("Doing the same thing for OrderLines")
            for order in saved_orders:
                order_lines_to_create.append(
                    OrderLine(
                        order=order,
                        product=order._temp_product,
                        quantity_sold=order._temp_quantity,
                        unit_price_at_sale=order._temp_product.price
                    )
                )
            self.stdout.write("Saving the OrderLine items")
            OrderLine.objects.bulk_create(order_lines_to_create, batch_size=5000)

        self.stdout.write(self.style.SUCCESS("Database loaded with data!"))