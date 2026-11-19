from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from apps.users.models import BusinessUser
from core.tenancy import NoActiveBusiness, get_active_membership
from .models import Business
from .serializers import BusinessCreateSerializer, BusinessListSerializer, BusinessMeSerializer


class BusinessViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _set_active_business(self, request, business):
        request.user.active_business = business
        request.user.save(update_fields=["active_business"])

    def _list_context(self, request):
        return {"active_business_id": request.user.active_business_id}

    def list(self, request):
        """All businesses this user is a member of, the active one first."""
        memberships = sorted(
            request.user.businessuser_set.select_related("business"),
            key=lambda m: (m.business_id != request.user.active_business_id, m.business.name),
        )
        serializer = BusinessListSerializer(memberships, many=True, context=self._list_context(request))
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """Create a new business, make the current user its owner and switch to it."""
        serializer = BusinessCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        business = Business.objects.create(name=serializer.validated_data["name"], owner=None)
        business_user = BusinessUser.objects.create(
            user=request.user,
            business=business,
            role=BusinessUser.Roles.OWNER,
        )
        business.owner = business_user
        business.save(update_fields=["owner"])
        self._set_active_business(request, business)

        return Response(
            BusinessListSerializer(business_user, context=self._list_context(request)).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """Switch the caller's active business to the given business id."""
        membership = request.user.businessuser_set.select_related("business").filter(business_id=pk).first()
        if membership is None:
            return Response(
                {"detail": "You are not a member of this business."},
                status=status.HTTP_404_NOT_FOUND,
            )

        self._set_active_business(request, membership.business)
        return Response(BusinessListSerializer(membership, context=self._list_context(request)).data)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Returns the currently active business for this user."""
        membership = get_active_membership(request)
        if membership is None:
            raise NoActiveBusiness()
        return Response(BusinessMeSerializer(membership).data)
