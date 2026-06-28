from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import InventoryDashboardSerializer
from .services import InventoryService

class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    inventory_service = InventoryService()
    serializer_class = InventoryDashboardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.inventory_service.get_annotated_inventory_list(business=self.request.user.business)

    def retrieve(self, request, pk=None):
        inventory = self.get_object()
        serializer = self.get_serializer(inventory)
        return Response(serializer.data)