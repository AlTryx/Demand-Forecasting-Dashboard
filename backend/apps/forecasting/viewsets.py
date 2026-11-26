from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from core.tenancy import BusinessScopedMixin
from .models import ForecastResult
from .serializers import ForecastResultSerializer
from .services import ForecastingService


class ForecastPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500


class ForecastingViewSet(BusinessScopedMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ForecastResultSerializer
    pagination_class = ForecastPagination
    queryset = ForecastResult.objects.none()

    def get_queryset(self):
        product_id = self.request.query_params.get("product_id")
        if product_id is not None:
            try:
                product_id = int(product_id)
            except ValueError:
                raise ValidationError({"product_id": "Must be a whole number."})

        return ForecastingService().get_latest_forecasts(self.business, product_id)

    @action(detail=False, methods=["post"], url_path="run")
    def run(self, request):
        created = ForecastingService.run_for_business(self.business)
        return Response({"forecasts_created": created})
