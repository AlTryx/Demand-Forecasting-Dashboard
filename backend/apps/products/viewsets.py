from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.utils.dateparse import parse_date, parse_datetime
from core.tenancy import BusinessScopedMixin
from .serializers import ProductSerializer, StockLogSerializer
from .services import ProductService
from .models import StockLog


class StockLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


def validation_message(exc):
    detail = exc.detail
    if isinstance(detail, dict):
        detail = [message for messages in detail.values() for message in messages]
    if isinstance(detail, list):
        return " ".join(str(message) for message in detail)
    return str(detail)


class ProductViewSet(BusinessScopedMixin, viewsets.GenericViewSet):
    pagination_class = StockLogPagination

    def paginate_and_respond(self, queryset, serializer_class=None):
        page = self.paginate_queryset(queryset)
        serializer_class = serializer_class or ProductSerializer
        if page is not None:
            serializer = serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = serializer_class(queryset, many=True)
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

    def _stock_history(self, request, pk=None):
        product = ProductService().get_product(pk, self.business)
        movements = StockLog.objects.filter(product=product)

        reason = request.query_params.get("reason")
        if reason:
            if reason not in StockLog.ChangeReasons.values:
                return Response(
                    {"error": f"Reason must be one of: {', '.join(StockLog.ChangeReasons.values)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            movements = movements.filter(reason=reason)

        quantity_changed = request.query_params.get("quantity_changed")
        if quantity_changed:
            try:
                movements = movements.filter(quantity_changed=int(quantity_changed))
            except (TypeError, ValueError):
                return Response(
                    {"error": "quantity_changed must be a valid integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        date_from = request.query_params.get("date_from") or request.query_params.get("start_date")
        date_to = request.query_params.get("date_to") or request.query_params.get("end_date")

        for parameter, value in (("date_from", date_from), ("date_to", date_to)):
            if value:
                parsed_date = parse_date(value)
                if parsed_date is None:
                    parsed_datetime = parse_datetime(value)
                    parsed_date = parsed_datetime.date() if parsed_datetime else None
                if parsed_date is None:
                    return Response(
                        {"error": f"{parameter} must be a valid ISO date"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if date_from:
            movements = movements.filter(created_at__date__gte=parse_date(date_from) or parse_datetime(date_from).date())
        if date_to:
            movements = movements.filter(created_at__date__lte=parse_date(date_to) or parse_datetime(date_to).date())

        if date_from and date_to:
            from_date = parse_date(date_from) or parse_datetime(date_from).date()
            to_date = parse_date(date_to) or parse_datetime(date_to).date()
            if from_date > to_date:
                return Response(
                    {"error": "date_from must be before or equal to date_to"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Pagination
        paginator = StockLogPagination()
        movements = movements.select_related("product").order_by("-created_at", "-id")

        page = paginator.paginate_queryset(movements, request)
        serializer = StockLogSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=["get"], url_path="stock_history")
    def stock_history(self, request, pk=None):
        return self._stock_history(request, pk)

    @action(detail=True, methods=["get"], url_path="stock-history")
    def stock_history_hyphenated(self, request, pk=None):
        return self._stock_history(request, pk)

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
            return Response({"error": validation_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"error": validation_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductSerializer(product)
        return Response(serializer.data)