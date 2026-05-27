from rest_framework import serializers
from .models import Product
from .services import ProductService

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "category", "price", "current_stock", "business", "created_at", "updated_at"]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be >= 0")
        return value

    def create(self, validated_data):
        return ProductService().create_product(**validated_data)

# TO DO: class StockSerializer(serializers.Serializer):
#     amount = serializers.IntegerField(min_value=1)