"""Serializers for catalog models."""
from __future__ import annotations

from rest_framework import serializers

from simplycrm.catalog import models


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Category
        fields = ["id", "organization", "name", "slug", "parent"]
        read_only_fields = ["id"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Supplier
        fields = ["id", "organization", "name", "contact_email", "phone_number", "notes"]
        read_only_fields = ["id"]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductVariant
        fields = ["id", "product", "name", "sku", "attributes", "price", "cost"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    main_image = serializers.FileField(required=False, allow_null=True, write_only=True)
    main_image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = models.Product
        fields = [
            "id",
            "organization",
            "category",
            "category_name",
            "name",
            "sku",
            "description",
            "main_image",
            "main_image_url",
            "is_active",
            "variants",
        ]
        read_only_fields = ["id", "organization", "main_image_url", "category_name"]

    def get_main_image_url(self, obj):  # noqa: D401 - serializer helper
        request = self.context.get("request") if hasattr(self, "context") else None
        if not obj.main_image:
            return None
        url = obj.main_image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class InventoryLotSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InventoryLot
        fields = ["id", "variant", "supplier", "quantity", "received_at", "expires_at", "location"]
        read_only_fields = ["id"]


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PriceHistory
        fields = ["id", "variant", "price", "currency", "recorded_at", "recorded_by"]
        read_only_fields = ["id", "recorded_at"]
