from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import ForecastingViewSet

router = DefaultRouter()
router.register(r'results', ForecastingViewSet, basename='forecast-results')

urlpatterns = [
    path('', include(router.urls)),
]