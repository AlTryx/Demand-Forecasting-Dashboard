from django.urls import path

from .viewsets import SummaryView, TimelineView, TopProductsView

urlpatterns = [
    path("summary/", SummaryView.as_view(), name="analytics-summary"),
    path("timeline/", TimelineView.as_view(), name="analytics-timeline"),
    path("top-products/", TopProductsView.as_view(), name="analytics-top-products"),
]
