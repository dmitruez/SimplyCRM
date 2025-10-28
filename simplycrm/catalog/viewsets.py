"""ViewSets for catalog resources."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from simplycrm.catalog import models, serializers
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.Category.objects.none()
        return models.Category.objects.filter(organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "catalog.manage_suppliers"
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.Supplier.objects.none()
        return models.Supplier.objects.filter(organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.Product.objects.none()
        return (
            models.Product.objects.filter(organization=organization)
            .prefetch_related("variants")
        )

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)

    def get_serializer_context(self):  # type: ignore[override]
        context = super().get_serializer_context()
        context.setdefault("request", self.request)
        return context


class ProductVariantViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.ProductVariant.objects.none()
        return models.ProductVariant.objects.filter(product__organization=organization)


class InventoryLotViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.InventoryLotSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "inventory.advanced_tracking"
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.InventoryLot.objects.none()
        return models.InventoryLot.objects.filter(variant__product__organization=organization)


class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.PriceHistorySerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "pricing.history_view"
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.PriceHistory.objects.none()
        return models.PriceHistory.objects.filter(variant__product__organization=organization)
