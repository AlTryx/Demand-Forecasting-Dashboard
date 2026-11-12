from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ForecastResult
from .serializers import ForecastResultSerializer
from .services import ForecastingService
from apps.products.services import ProductService
from rest_framework.exceptions import PermissionDenied, ValidationError

class ForecastingViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes=[IsAuthenticated]

    queryset = ForecastResult.objects.all()

    def get_business(self, request):
        business_user = request.user.businessuser_set.filter(is_active=True).first()
        if not business_user:
            raise PermissionDenied("User has no active business")
        return business_user.business

    def list(self, request, *args, **kwargs):
        forecasting_service = ForecastingService()
        business = self.get_business(request)
        business_id = business.id
        product_id = request.query_params.get('product_id')

        if product_id:
            forecasting_queryset = forecasting_service.get_latest_forecast_for_product(
                business=business,
                product_id=product_id
            )

        else:
            forecasting_queryset = forecasting_service.get_latest_n_forecasts(business_id)

        serializer = ForecastResultSerializer(forecasting_queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="run")
    def run(self, request):
        created = ForecastingService.run_for_business(self.get_business(request))
        return Response({"forecasts_created": created})
