from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.permissions import HasActiveBusiness
from core.utils import get_active_business
from .services import AnalyticsService

DEFAULT_TIMELINE_WEEKS = 12


class AnalyticsParams(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, min_value=1)
    weeks = serializers.IntegerField(required=False, min_value=1, max_value=104)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50, default=5)
    order_by = serializers.ChoiceField(choices=["units", "revenue"], required=False, default="revenue")


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated, HasActiveBusiness]

    def service_and_params(self, request, use_product=True):
        params = AnalyticsParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        product_id = data.get("product_id") if use_product else None
        return AnalyticsService(get_active_business(request.user), product_id), data


class SummaryView(AnalyticsView):
    def get(self, request):
        service, _ = self.service_and_params(request)
        return Response(service.summary())


class TimelineView(AnalyticsView):
    def get(self, request):
        service, params = self.service_and_params(request)
        return Response(service.timeline(params.get("weeks", DEFAULT_TIMELINE_WEEKS)))


class TopProductsView(AnalyticsView):
    def get(self, request):
        service, params = self.service_and_params(request, use_product=False)
        return Response(service.top_products(params["limit"], params.get("weeks"), params["order_by"]))
