from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from core.tenancy import BusinessScopedMixin
from .serializers import ProductSerializer
from .services import ProductService
from .models import StockLog

class ProductViewSet(BusinessScopedMixin, viewsets.GenericViewSet):
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

        business = self.business
        products = service.get_all_products(business)

        return self.paginate_and_respond(products)

    def create(self, request):
        service = ProductService()

        business = self.business

        serializer = ProductSerializer(data=request.data, context={"business": business})
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

        business = self.business
        product = service.get_product(pk, business)

        serializer = ProductSerializer(product)
        return Response(serializer.data)

    def update(self, request, pk=None):
        service = ProductService()

        business = self.business
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

        business = self.business
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

        business = self.business
        service.delete_product(pk, business)

        return Response(status=status.HTTP_204_NO_CONTENT)

    # Custom endpoints

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        service = ProductService()

        business = self.business
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

        business = self.business
        threshold = int(request.query_params.get("threshold", 10))

        products = service.get_low_stock_products(business, threshold)
        return self.paginate_and_respond(products)

    @action(detail=False, methods=["get"], url_path="out_of_stock")
    def out_of_stock(self, request):
        service = ProductService()

        business = self.business
        products = service.get_out_of_stock_products(business)
        return self.paginate_and_respond(products)

    # Stock actions

    @action(detail=True, methods=["post"], url_path="decrease_stock")
    def decrease_stock(self, request, pk=None):
        service = ProductService()

        business = self.business

        amount = request.data.get("amount")
        reason = request.data.get("reason")

        if amount is None:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reason is None:
            return Response(
                {"error": "Reason is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = int(amount)
        except (TypeError, ValueError):
            return Response(
                {"error": "Amount must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = service.decrease_stock(pk, business, amount, reason)
        except ValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductSerializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="increase_stock")
    def increase_stock(self, request, pk=None):
        service = ProductService()

        business = self.business

        amount = request.data.get("amount")
        reason = request.data.get("reason")

        if amount is None:
            return Response(
                {"error": "Amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reason is None:
            return Response(
                {"error": "Reason is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = int(amount)
        except (TypeError, ValueError):
            return Response(
                {"error": "Amount must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = service.increase_stock(pk, business, amount, reason)
        except ValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductSerializer(product)
        return Response(serializer.data)