from django.urls import path, include
from .viewsets import SalesImportViewSet, SalesViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'checkout', SalesViewSet, basename='sales-checkout')
router.register(r'imports', SalesImportViewSet, basename='sales-imports')

urlpatterns=[
    path("", include(router.urls))
]