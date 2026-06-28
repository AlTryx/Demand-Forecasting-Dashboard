from rest_framework import serializers
from .models import Inventory

class InventoryDashboardSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='computed_status')
    product_name = serializers.CharField(source='product.name')

    class Meta:
        model = Inventory
        fields = ['id', 'product_name', 'sku', 'days_of_stock_left', 'status', 'recommended_reorder_quantity']