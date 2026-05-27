from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from .serializers import ProductSerializer
from .services import ProductService

class ProductViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_business(self, request):
        business_user = request.user.businessuser_set.first()
        if not business_user:
            raise ValueError("User has no business")
        return business_user.business

    def list(self, request):
        product_service = ProductService()

        business = self.get_business(request)
        products = product_service.get_all_products(business=business)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        product_service = ProductService()

        business = self.get_business(request)

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
        product_service = ProductService()

        business = self.get_business(request)
        query = request.query_params.get("q")
        if query is None:
            return Response(
                {"error": "Name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        products = product_service.search_products_by_name(business, query)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path='out_of_stock')
    def out_of_stock(self, request):
        product_service = ProductService()

        business = self.get_business(request)
        products = product_service.get_out_of_stock_products(business)

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path='low_stock')
    def low_stock(self, request):
        product_service = ProductService()

        business = self.get_business(request)
        threshold = int(request.query_params.get("threshold", 10))
        products = product_service.get_low_stock_products(business, threshold)

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path='decrease_stock')
    def decrease_stock(self, request, pk=None):
        product_service = ProductService()

        amount = request.data.get("amount")
        if amount is None:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = product_service.decrease_stock(pk, int(amount))
        serializer = ProductSerializer(product)
        return Response(serializer.data)
