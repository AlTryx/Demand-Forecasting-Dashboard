from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from ..users.serializers.user_serializer import UserSerializer
from .services import get_all_products

class ProductViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='products')
    def products(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return get_all_products(user)