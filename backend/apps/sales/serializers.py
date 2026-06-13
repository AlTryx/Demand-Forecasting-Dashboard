from rest_framework import serializers

class OrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class CheckoutSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    items = OrderItemSerializer(many=True)