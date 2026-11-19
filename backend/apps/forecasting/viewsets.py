from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ForecastResult
from .serializers import ForecastResultSerializer
from .services import ForecastingService
from rest_framework.exceptions import PermissionDenied, ValidationError


class ForecastPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500


class ForecastingViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ForecastResultSerializer
    pagination_class = ForecastPagination
    queryset = ForecastResult.objects.none()

    def get_business(self, request):
        business_user = request.user.businessuser_set.filter(is_active=True).first()
        if not business_user:
            raise PermissionDenied("User has no active business")
        return business_user.business

    def get_queryset(self):
        product_id = self.request.query_params.get("product_id")
        if product_id is not None:
            try:
                product_id = int(product_id)
            except ValueError:
                raise ValidationError({"product_id": "Must be a whole number."})

        return ForecastingService().get_latest_forecasts(self.get_business(self.request), product_id)

    @action(detail=False, methods=["post"], url_path="run")
    def run(self, request):
        created = ForecastingService.run_for_business(self.get_business(request))
        return Response({"forecasts_created": created})
