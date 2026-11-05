from rest_framework import serializers

from .models import ImportJob

class OrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class CheckoutSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    items = OrderItemSerializer(many=True)


class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportJob
        fields = [
            "id",
            "status",
            "file_name",
            "rows_processed",
            "rows_written",
            "rows_skipped",
            "products_created",
            "row_errors",
            "error",
            "created_at",
            "finished_at",
        ]
        read_only_fields = fields
