"""ViewSets for catalog resources."""
from __future__ import annotations

from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from simplycrm.catalog import filters as catalog_filters
from simplycrm.catalog import models, serializers
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = catalog_filters.CategoryFilterSet
    search_fields = ("name", "slug")

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.Category.objects.none()
        return (
            models.Category.objects.filter(organization=organization)
            .select_related("parent")
            .order_by("name")
        )

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)

    @decorators.action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        categories = list(queryset)
        nodes = {category.id: {**self.get_serializer(category).data, "children": []} for category in categories}
        roots = []
        for category in categories:
            node = nodes[category.id]
            if category.parent_id and category.parent_id in nodes:
                nodes[category.parent_id]["children"].append(node)
            else:
                roots.append(node)
        return response.Response(roots)


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "catalog.manage_suppliers"
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = catalog_filters.SupplierFilterSet
    search_fields = ("name", "contact_email", "phone_number")

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
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = catalog_filters.ProductFilterSet
    search_fields = ("name", "sku", "slug")
    ordering_fields = (
        "name",
        "sku",
        "created_at",
        "updated_at",
        "published_at",
    )
    ordering = ("name",)

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.Product.objects.none()
        variants_qs = models.ProductVariant.objects.order_by("id")
        return (
            models.Product.objects.filter(organization=organization)
            .select_related("category")
            .prefetch_related(Prefetch("variants", queryset=variants_qs))
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

    @decorators.action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        product = self.get_object()
        status_value = request.data.get("status")
        if status_value not in dict(models.Product.Status.choices):
            raise ValidationError({"status": "Недопустимый статус."})
        product.set_status(status_value)
        serializer = self.get_serializer(product)
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class ProductVariantViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = catalog_filters.ProductVariantFilterSet
    search_fields = ("name", "sku")
    ordering_fields = ("name", "sku", "created_at", "updated_at")
    ordering = ("name",)

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.ProductVariant.objects.none()
        return models.ProductVariant.objects.filter(product__organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        product = serializer.validated_data.get("product")
        if not product or product.organization_id != organization.id:
            raise ValidationError("Нельзя создавать вариант для чужой организации.")
        serializer.save(recorded_by=self._get_recorded_by())

    def perform_update(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        product = serializer.instance.product
        if product.organization_id != organization.id:
            raise ValidationError("Недостаточно прав для изменения варианта.")
        serializer.save(recorded_by=self._get_recorded_by())

    def _get_recorded_by(self):
        user = getattr(self.request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return user
        return None


class InventoryLotViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.InventoryLotSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "inventory.advanced_tracking"
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = catalog_filters.InventoryLotFilterSet
    ordering_fields = ("received_at", "expires_at", "quantity")
    ordering = ("-received_at",)

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.InventoryLot.objects.none()
        return models.InventoryLot.objects.filter(variant__product__organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        variant = serializer.validated_data.get("variant")
        if variant.product.organization_id != organization.id:
            raise ValidationError("Нельзя создавать партии для чужой организации.")
        if serializer.validated_data.get("supplier") and serializer.validated_data["supplier"].organization_id != organization.id:
            raise ValidationError("Поставщик принадлежит другой организации.")
        serializer.save()

    def perform_update(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        variant = serializer.instance.variant
        if variant.product.organization_id != organization.id:
            raise ValidationError("Недостаточно прав для изменения партии.")
        supplier = serializer.validated_data.get("supplier")
        if supplier and supplier.organization_id != organization.id:
            raise ValidationError("Поставщик принадлежит другой организации.")
        serializer.save()


class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.PriceHistorySerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "pricing.history_view"
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = catalog_filters.PriceHistoryFilterSet
    ordering_fields = ("recorded_at", "price")
    ordering = ("-recorded_at",)

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.PriceHistory.objects.none()
        return models.PriceHistory.objects.filter(variant__product__organization=organization)
