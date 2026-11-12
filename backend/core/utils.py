from rest_framework.exceptions import PermissionDenied


def get_active_business(user):
    business_user = user.businessuser_set.filter(is_active=True).select_related("business").first()
    if not business_user:
        raise PermissionDenied("User has no active business")
    return business_user.business
