from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ForecastResult
from .serializers import ForecastResultSerializer

class ForecastingViewSet(viewsets.ReadOnlyModelViewSet):

