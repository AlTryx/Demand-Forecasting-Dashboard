from rest_framework import serializers
from .models import ForecastResult
from datetime import timedelta

class ForecastResultSerializer(serializers.ModelSerializer):
    horizon_display = serializers.CharField(source='get_horizon_display', read_only=True)
    target_date = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.stock_keeping_unit', read_only=True, allow_null=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ForecastResult
        fields = [
            'id',
            'product',
            'product_name',
            'product_sku',
            'product_price',
            'predicted_quantity',
            'lower_bound',
            'upper_bound',
            'horizon',
            'horizon_display',
            'confidence_score',
            'generated_at',
            'target_date'
        ]

    def get_target_date(self, obj):
        if obj.week_start:
            return obj.week_start.isoformat()
        base_time = obj.generated_at if obj.generated_at else obj.created_at
        delivery_date = base_time + timedelta(days=obj.horizon)
        return delivery_date.strftime('%Y-%m-%d')