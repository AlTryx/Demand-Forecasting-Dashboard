from rest_framework import viewsets
from rest_framework.response import Response
from core.tenancy import BusinessScopedMixin
from .serializers import InventoryDashboardSerializer
from .services import InventoryService

class InventoryViewSet(BusinessScopedMixin, viewsets.ReadOnlyModelViewSet):
    inventory_service = InventoryService()
    serializer_class = InventoryDashboardSerializer

    def get_queryset(self):
        return self.inventory_service.get_annotated_inventory_list(business=self.business)

    def retrieve(self, request, pk=None):
        inventory = self.get_object()
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)
