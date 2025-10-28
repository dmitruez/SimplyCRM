"""FilterSets for the catalog API."""
from __future__ import annotations

import django_filters

from simplycrm.catalog import models


class CategoryFilterSet(django_filters.FilterSet):
    parent = django_filters.NumberFilter(field_name="parent_id")
    slug = django_filters.CharFilter(field_name="slug", lookup_expr="iexact")
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = models.Category
        fields = ["parent", "slug", "is_active"]


class SupplierFilterSet(django_filters.FilterSet):
    class Meta:
        model = models.Supplier
        fields = ["name", "contact_email"]


class ProductFilterSet(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category_id")
    category_slug = django_filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    status = django_filters.MultipleChoiceFilter(choices=models.Product.Status.choices)
    is_active = django_filters.BooleanFilter()
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    updated_before = django_filters.DateTimeFilter(field_name="updated_at", lookup_expr="lte")
    updated_after = django_filters.DateTimeFilter(field_name="updated_at", lookup_expr="gte")

    class Meta:
        model = models.Product
        fields = [
            "category",
            "category_slug",
            "status",
            "is_active",
            "sku",
        ]


class ProductVariantFilterSet(django_filters.FilterSet):
    product = django_filters.NumberFilter(field_name="product_id")
    status = django_filters.MultipleChoiceFilter(choices=models.ProductVariant.Status.choices)
    sku = django_filters.CharFilter(lookup_expr="iexact")

    class Meta:
        model = models.ProductVariant
        fields = ["product", "status", "sku"]


class InventoryLotFilterSet(django_filters.FilterSet):
    variant = django_filters.NumberFilter(field_name="variant_id")
    supplier = django_filters.NumberFilter(field_name="supplier_id")
    received_from = django_filters.DateFilter(field_name="received_at", lookup_expr="gte")
    received_to = django_filters.DateFilter(field_name="received_at", lookup_expr="lte")

    class Meta:
        model = models.InventoryLot
        fields = ["variant", "supplier", "received_from", "received_to"]


class PriceHistoryFilterSet(django_filters.FilterSet):
    variant = django_filters.NumberFilter(field_name="variant_id")
    product = django_filters.NumberFilter(field_name="variant__product_id")
    recorded_from = django_filters.DateTimeFilter(field_name="recorded_at", lookup_expr="gte")
    recorded_to = django_filters.DateTimeFilter(field_name="recorded_at", lookup_expr="lte")

    class Meta:
        model = models.PriceHistory
        fields = ["variant", "product", "recorded_from", "recorded_to"]
