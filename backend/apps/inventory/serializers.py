from rest_framework import serializers
from .models import Inventory

class InventoryDashboardSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='computed_status') #anotated status in inventory/services.py
    product_name = serializers.CharField(source='product.name')
    stock_keeping_unit = serializers.CharField(source='product.stock_keeping_unit')

    class Meta:
        model = Inventory
        fields = ['id', 'product_name', 'stock_keeping_unit', 'days_of_stock_left', 'status', 'recommended_reorder_quantity']