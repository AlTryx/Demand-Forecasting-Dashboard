from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated

from apps.users.models import BusinessUser


class NoActiveBusiness(PermissionDenied):
    default_detail = "You have no active business. Create or select one first."
    default_code = "no_active_business"


def get_active_membership(request):
    if not hasattr(request, "_active_membership"):
        user = request.user
        membership = None
        if user.is_authenticated and user.active_business_id is not None:
            membership = (
                BusinessUser.objects.select_related("business")
                .filter(user=user, business_id=user.active_business_id)
                .first()
            )
        request._active_membership = membership
    return request._active_membership


def get_active_business(request):
    membership = get_active_membership(request)
    if membership is None:
        raise NoActiveBusiness()
    return membership.business


class HasActiveBusiness(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        get_active_business(request)
        return True


class BusinessScopedMixin:
    permission_classes = [IsAuthenticated, HasActiveBusiness]

    @property
    def business(self):
        return get_active_business(self.request)

    @property
    def membership(self):
        return get_active_membership(self.request)
