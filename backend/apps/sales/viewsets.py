from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .serializers import CheckoutSerializer
from .services import SalesService

class SalesViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_business(self, request):
        business_user = request.user.businessuser_set.first()
        if not business_user:
            raise ValidationError({"detail": "User has no business assigned."})
        return business_user.business

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data)
        if serializer.is_valid():
            sales_service = SalesService()
            business = self.get_business(request)

            order = sales_service.process_checkout(
                business=business,
                items_data=serializer.validated_data['items'],
                payment_method=serializer.validated_data['payment_method']
            )
            return Response(
                {"status": "Success", "order_id": order.id},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)