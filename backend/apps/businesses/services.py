from .models import Business
from rest_framework.exceptions import NotFound, ValidationError

class BusinessService:
    @staticmethod
    def create_business(name, owner):
        return Business.objects.create(
            name=name,
            owner=owner
        )

    def get_business(self, business_id, owner):
        try:
            return Business.objects.get(business_id, owner=owner)
        except Business.DoesNotExist:
            return NotFound("Business does not exist.")

    def update_business(self, business_id, owner, **kwargs):
        business = self.get_business(business_id, owner)

        for field, value in kwargs.items():
            if hasattr(business, field):
                setattr(business, field, value)

        business.save()
        return business

    def delete_business(self, business_id, owner):
        business = self.get_business(business_id, owner)
        business.delete()