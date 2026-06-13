from django.urls import path, include
from .viewsets import SalesViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'checkout', SalesViewSet, basename='sales-checkout')

urlpatterns=[
    path("", include(router.urls))
]