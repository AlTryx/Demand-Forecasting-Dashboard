from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import InventoryViewSet

router = DefaultRouter()
router.register(r'results', InventoryViewSet, basename='inventory')

urlpatterns = [
    path('', include(router.urls)),
]