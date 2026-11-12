import uuid
from pathlib import Path

from django.conf import settings
from django.db import transaction
from rest_framework import mixins, viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from apps.products.permissions import HasActiveBusiness
from core.utils import get_active_business
from .imports import ACTIVE_STATUSES, expire_stale_jobs, start_import_in_background
from .models import ImportJob
from .serializers import CheckoutSerializer, ImportJobSerializer
from .services import SalesService

class SalesViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_business(self, request):
        business_user = request.user.businessuser_set.filter(is_active=True).first()
        if not business_user:
            raise ValidationError({"detail": "User has no business assigned."})
        return business_user.business

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data)
        if serializer.is_valid():
            sales_service = SalesService()
            business = self.get_business(request)

            order = sales_service.process_checkout(
                business=business,
                items_data=serializer.validated_data['items'],
                payment_method=serializer.validated_data['payment_method']
            )
            return Response(
                {"status": "Success", "order_id": order.id},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalesImportViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasActiveBusiness]
    serializer_class = ImportJobSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        return ImportJob.objects.filter(business=get_active_business(self.request.user))

    def create(self, request):
        business = get_active_business(request.user)
        upload = request.FILES.get("file")

        if upload is None:
            raise ValidationError({"file": ["No file was uploaded."]})
        if not upload.name.lower().endswith(".csv"):
            raise ValidationError({"file": ["Only .csv files are supported."]})
        if upload.size > settings.SALES_IMPORT_MAX_BYTES:
            limit_mb = settings.SALES_IMPORT_MAX_BYTES // (1024 * 1024)
            raise ValidationError({"file": [f"The file is larger than {limit_mb} MB."]})

        expire_stale_jobs(business)
        if ImportJob.objects.filter(business=business, status__in=ACTIVE_STATUSES).exists():
            return Response(
                {"detail": "Another import is still running. Wait for it to finish."},
                status=status.HTTP_409_CONFLICT,
            )

        import_dir = Path(settings.SALES_IMPORT_DIR)
        import_dir.mkdir(parents=True, exist_ok=True)
        path = import_dir / f"{uuid.uuid4()}.csv"
        with path.open("wb") as destination:
            for part in upload.chunks():
                destination.write(part)

        job = ImportJob.objects.create(
            business=business,
            created_by=request.user,
            file_name=Path(upload.name).name[:255],
            file_path=str(path),
        )
        transaction.on_commit(lambda: start_import_in_background(job.id))
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
