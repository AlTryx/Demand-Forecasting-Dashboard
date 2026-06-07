from rest_framework import serializers
from .models import ForecastResult

class ForecastResultSerializer(serializers.ModelSerializer):
    horizon_display = serializers.CharField(source='get_horizon_display', read_only=True)

    class SummaryMeta:
        model = ForecastResult
        fields = [
            'id',
            'product',
            'predicted_quantity',
            'horizon',
            'horizon_display',
            'confidence_score',
            'generated_at'
        ]