from rest_framework import serializers
from .models import Product
from .services import ProductService

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "category", "price", "current_stock", "stock_keeping_unit", "created_at", "updated_at"]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        business = self.instance.business if self.instance else self.context.get("business")
        if business is None:
            return value
        duplicates = Product.objects.filter(business=business, name=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A product with this name already exists.")
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be >= 0")
        return value

    def create(self, validated_data):
        return ProductService().create_product(
            business=self.context.get("business"),
            **validated_data,
        )

# TO DO: class StockSerializer(serializers.Serializer):
#     amount = serializers.IntegerField(min_value=1)