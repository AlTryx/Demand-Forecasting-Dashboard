from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from .serializers import ProductSerializer
from .services import ProductService
from .permissions import HasActiveBusiness

class ProductViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasActiveBusiness]

    def get_business(self, request):
        business_user = request.user.businessuser_set.filter(is_active=True).first()
        if not business_user:
            raise ValueError("User has no active business")
        return business_user.business

    def paginate_and_respond(self, queryset):
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ProductSerializer(queryset, many=True)
        return Response(serializer.data)

    # CRUD

    def list(self, request):
        service = ProductService()

        business = self.get_business(request)
        products = service.get_all_products(business)

        return self.paginate_and_respond(products)

    def create(self, request):
        service = ProductService()

        business = self.get_business(request)

        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            product = service.create_product(
                business=business,
                **serializer.validated_data
            )
            return Response(
                ProductSerializer(product).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)
        product = service.get_product(pk, business)

        serializer = ProductSerializer(product)
        return Response(serializer.data)

    def update(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)
        product = service.get_product(pk, business)

        serializer = ProductSerializer(product, data=request.data)

        if serializer.is_valid():
            updated_product = service.update_product(
                pk,
                business,
                **serializer.validated_data
            )

            return Response(
                ProductSerializer(updated_product).data
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)
        product = service.get_product(pk, business)

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            updated_product = service.update_product(
                pk,
                business,
                **serializer.validated_data
            )

            return Response(
                ProductSerializer(updated_product).data
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)
        service.delete_product(pk, business)

        return Response(status=status.HTTP_204_NO_CONTENT)

    # Custom endpoints

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        service = ProductService()

        business = self.get_business(request)
        query = request.query_params.get("q")

        if not query:
            return Response(
                {"error": "Query is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        products = service.search_products_by_name(business, query)
        return self.paginate_and_respond(products)

    @action(detail=False, methods=["get"], url_path="low_stock")
    def low_stock(self, request):
        service = ProductService()

        business = self.get_business(request)
        threshold = int(request.query_params.get("threshold", 10))

        products = service.get_low_stock_products(business, threshold)
        return self.paginate_and_respond(products)

    @action(detail=False, methods=["get"], url_path="out_of_stock")
    def out_of_stock(self, request):
        service = ProductService()

        business = self.get_business(request)
        products = service.get_out_of_stock_products(business)
        return self.paginate_and_respond(products)

    # Stock actions

    @action(detail=True, methods=["post"], url_path="decrease_stock")
    def decrease_stock(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)

        amount = request.data.get("amount")
        if amount is None:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = service.decrease_stock(pk, business, int(amount))

        serializer = ProductSerializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="increase_stock")
    def increase_stock(self, request, pk=None):
        service = ProductService()

        business = self.get_business(request)

        amount = request.data.get("amount")
        if amount is None:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = service.increase_stock(pk, business, int(amount))

        serializer = ProductSerializer(product)
        return Response(serializer.data)