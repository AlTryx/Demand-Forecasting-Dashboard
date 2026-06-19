from rest_framework import serializers
from .models import ForecastResult
from datetime import timedelta

class ForecastResultSerializer(serializers.ModelSerializer):
    horizon_display = serializers.CharField(source='get_horizon_display', read_only=True)
    target_date = serializers.SerializerMethodField()

    class Meta:
        model = ForecastResult
        fields = [
            'id',
            'product',
            'predicted_quantity',
            'horizon',
            'horizon_display',
            'confidence_score',
            'generated_at',
            'target_date'
        ]

    def get_target_date(self, obj):
        base_time = obj.generated_at if obj.generated_at else obj.created_at
        delivery_date = base_time + timedelta(days=obj.horizon)
        return delivery_date.strftime('%Y-%m-%d')