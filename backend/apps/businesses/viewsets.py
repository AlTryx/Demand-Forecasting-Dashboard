from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from apps.users.models import BusinessUser
from .models import Business
from .serializers import BusinessCreateSerializer, BusinessListSerializer, BusinessMeSerializer


class BusinessViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    # ── helpers ──────────────────────────────────────────────────────────────

    def _active_business_user(self, request):
        return request.user.businessuser_set.filter(is_active=True).first()

    def _deactivate_all(self, request):
        request.user.businessuser_set.update(is_active=False)

    # ── endpoints ────────────────────────────────────────────────────────────

    def list(self, request):
        """All businesses this user is a member of."""
        memberships = request.user.businessuser_set.select_related("business").order_by(
            "-is_active", "business__name"
        )
        serializer = BusinessListSerializer(memberships, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """Create a new business and make the current user its owner."""
        serializer = BusinessCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate previous selection before making the new one active.
        self._deactivate_all(request)

        business = Business.objects.create(name=serializer.validated_data["name"], owner=None)
        business_user = BusinessUser.objects.create(
            user=request.user,
            business=business,
            role=BusinessUser.Roles.OWNER,
            is_active=True,
        )
        business.owner = business_user
        business.save(update_fields=["owner"])

        return Response(BusinessListSerializer(business_user).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="activate")
    @transaction.atomic
    def activate(self, request, pk=None):
        """Switch the caller's active business to the given business id."""
        try:
            membership = request.user.businessuser_set.get(business_id=pk)
        except BusinessUser.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this business."},
                status=status.HTTP_404_NOT_FOUND,
            )

        self._deactivate_all(request)
        membership.is_active = True
        membership.save(update_fields=["is_active"])

        return Response(BusinessListSerializer(membership).data)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Returns the currently active business for this user."""
        business_user = self._active_business_user(request)
        if not business_user:
            return Response(
                {"detail": "No active business found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(BusinessMeSerializer(business_user).data)
