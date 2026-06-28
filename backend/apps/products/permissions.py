from rest_framework.permissions import BasePermission

class HasActiveBusiness(BasePermission):
    message = "You must be associated with a business to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.businessuser_set.filter(is_active=True).exists()