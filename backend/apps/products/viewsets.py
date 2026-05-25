from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from .serializers import ProductSerializer
from .services import ProductService

class ProductViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        product_service = ProductService()

        business_user = request.user.businessuser_set.first()
        business = business_user.business
        products = product_service.get_all_products(business=business)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        product_service = ProductService()

        business_user = request.user.businessuser_set.first()
        business = business_user.business
        serializer = ProductSerializer(data=request.data)

        if serializer.is_valid():
            product = product_service.create_product(
                business=business,
                **serializer.validated_data
            )
            return Response(
                ProductSerializer(product).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        product_service = ProductService()
        product = product_service.get_product(pk)
        serializer = ProductSerializer(product)

        return Response(serializer.data)

    def destroy(self, request, pk=None):
        product_service = ProductService()
        product_service.delete_product(pk)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path='search')
    def search(self, request):
        return

    @action(detail=False, methods=["get"], url_path='low_stock')
    def low_stock(self, request):
        return
