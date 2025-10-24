"""ViewSets for catalog resources."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from simplycrm.catalog import models, serializers
from simplycrm.core.permissions import HasFeaturePermission


class CategoryViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.CategorySerializer
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):  # type: ignore[override]
		user = self.request.user
		return models.Category.objects.filter(organization=user.organization)
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)


class SupplierViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.SupplierSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "catalog.manage_suppliers"
	
	def get_queryset(self):  # type: ignore[override]
		user = self.request.user
		return models.Supplier.objects.filter(organization=user.organization)
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)


class ProductViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.ProductSerializer
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):  # type: ignore[override]
		user = self.request.user
		return models.Product.objects.filter(organization=user.organization).prefetch_related("variants")
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)


class ProductVariantViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.ProductVariantSerializer
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):  # type: ignore[override]
		return models.ProductVariant.objects.filter(product__organization=self.request.user.organization)


class InventoryLotViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.InventoryLotSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "inventory.advanced_tracking"
	
	def get_queryset(self):  # type: ignore[override]
		return models.InventoryLot.objects.filter(variant__product__organization=self.request.user.organization)


class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = serializers.PriceHistorySerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "pricing.history_view"
	
	def get_queryset(self):  # type: ignore[override]
		return models.PriceHistory.objects.filter(variant__product__organization=self.request.user.organization)
