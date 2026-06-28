from django.db.models import F, Case, When, Value, CharField, Subquery, OuterRef, Sum, PositiveIntegerField
from django.db.models.functions import Greatest
from .models import Inventory
from ..forecasting.models import ForecastResult

class InventoryService:
    @staticmethod
    def _get_latest_forecast_subquery():
        return ForecastResult.objects.filter(
            product_id=OuterRef('product_id'),
            horizon=ForecastResult.HORIZON.ONE_WEEK
        ).order_by('-generated_at').values('predicted_quantity')[:1]

    @staticmethod
    def get_annotated_inventory_list(cls, business):
        latest_forecast_subquery = cls._get_latest_forecast_subquery()

        return Inventory.objects.filter(product__business=business).annotate(
            forecast_demand=latest_forecast_subquery,

            computed_reorder_quantity=Greatest(
                Value(0),
                F('forecasted_demand') - F('product__current_stock'), #Here the difference could be negative, that's why we use Greatest()
                output_field=PositiveIntegerField()
            ),

            computed_status=Case(
                When(forecasted_demand__isnull=True, then=Value('UNKNOWN')),
                When(product__current_stock__lt=F('forecasted_demand'), then=Value('STOCKOUT_RISK')),
                When(days_of_stock_left__gt=60, then=Value('OVERSTOCK')),
                default=Value('OK'),
                output_field=CharField()
            )
        ).select_related('product')


    @classmethod
    def get_dashboard_cards_overview(cls, business):
        annotated_inventory_list = cls.get_annotated_inventory_list(cls, business)

        stockouts_at_risk_count = annotated_inventory_list.filter(computed_status="STOCKOUT_RISK").count()

        capital_aggregation = annotated_inventory_list.aggregate(
            total_capital_sum=Sum(F('computed_reorder_quantity') * F('product__price'))
        )
        total_capital_required = capital_aggregation['total_capital_required'] or 0

        return {
            stockouts_at_risk_count: stockouts_at_risk_count,
            'total_capital_required': total_capital_required,
        }