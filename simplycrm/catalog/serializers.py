"""Serializers for catalog models."""
from __future__ import annotations

import secrets
import string

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
    sku = serializers.CharField(required=False, allow_blank=True)
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

    def create(self, validated_data):  # type: ignore[override]
        sku = (validated_data.get("sku") or "").strip()
        if not sku:
            organization = validated_data.get("organization")
            if organization is None:
                raise serializers.ValidationError({
                    "sku": "Не удалось определить организацию для генерации SKU."
                })
            validated_data["sku"] = self._generate_unique_sku(organization)
        else:
            validated_data["sku"] = sku
        return super().create(validated_data)

    def update(self, instance, validated_data):  # type: ignore[override]
        if "sku" in validated_data:
            sku = (validated_data.get("sku") or "").strip()
            if not sku:
                raise serializers.ValidationError({"sku": "SKU не может быть пустым."})
            validated_data["sku"] = sku
        return super().update(instance, validated_data)

    @staticmethod
    def _generate_unique_sku(organization, length: int = 10, attempts: int = 20) -> str:
        alphabet = string.ascii_uppercase + string.digits
        for _ in range(attempts):
            candidate = "".join(secrets.choice(alphabet) for _ in range(length))
            if not models.Product.objects.filter(organization=organization, sku=candidate).exists():
                return candidate
        raise serializers.ValidationError({
            "sku": "Не удалось автоматически сгенерировать уникальный SKU. Укажите его вручную."
        })


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
