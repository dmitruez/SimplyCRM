"""Serializers for catalog models."""
from __future__ import annotations

import secrets
import string
from typing import Any

from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from simplycrm.catalog import models


class CategorySerializer(serializers.ModelSerializer):
    path = serializers.CharField(read_only=True)

    class Meta:
        model = models.Category
        fields = [
            "id",
            "organization",
            "name",
            "slug",
            "description",
            "parent",
            "is_active",
            "path",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "path",
            "created_at",
            "updated_at",
        ]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Supplier
        fields = [
            "id",
            "organization",
            "name",
            "contact_email",
            "phone_number",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "created_at", "updated_at"]


class ProductVariantSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=models.Product.objects.all(), required=False
    )
    price_history = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = models.ProductVariant
        fields = [
            "id",
            "product",
            "name",
            "sku",
            "attributes",
            "price",
            "cost",
            "currency",
            "barcode",
            "status",
            "is_default",
            "created_at",
            "updated_at",
            "price_history",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "price_history"]
        extra_kwargs = {
            "product": {"required": False},
        }

    def get_price_history(self, obj: models.ProductVariant):
        history = obj.price_history.all()[:5]
        return [
            {
                "price": str(entry.price),
                "currency": entry.currency,
                "recorded_at": entry.recorded_at,
            }
            for entry in history
        ]

    def create(self, validated_data):  # type: ignore[override]
        recorded_by = validated_data.pop("recorded_by", None)
        variant = models.ProductVariant(**validated_data)
        variant.save(recorded_by=recorded_by)
        return variant

    def update(self, instance, validated_data):  # type: ignore[override]
        recorded_by = validated_data.pop("recorded_by", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(recorded_by=recorded_by)
        return instance


class NestedProductVariantSerializer(ProductVariantSerializer):
    class Meta(ProductVariantSerializer.Meta):
        fields = [
            "id",
            "name",
            "sku",
            "attributes",
            "price",
            "cost",
            "currency",
            "barcode",
            "status",
            "is_default",
            "created_at",
            "updated_at",
            "price_history",
        ]
        read_only_fields = ["created_at", "updated_at", "price_history"]


class ProductSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(required=False, allow_blank=True)
    variants = NestedProductVariantSerializer(many=True, required=False)
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
            "slug",
            "sku",
            "description",
            "status",
            "attributes",
            "metadata",
            "main_image",
            "main_image_url",
            "is_active",
            "published_at",
            "variants",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "main_image_url",
            "category_name",
            "published_at",
            "created_at",
            "updated_at",
        ]

    def get_main_image_url(self, obj):  # noqa: D401 - serializer helper
        request = self.context.get("request") if hasattr(self, "context") else None
        if not obj.main_image:
            return None
        url = obj.main_image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def create(self, validated_data):  # type: ignore[override]
        variants_data = validated_data.pop("variants", [])
        if "status" not in validated_data:
            is_active = validated_data.get("is_active", True)
            validated_data["status"] = (
                models.Product.Status.ACTIVE if is_active else models.Product.Status.INACTIVE
            )
        sku = (validated_data.get("sku") or "").strip()
        if not sku:
            organization = validated_data.get("organization")
            if organization is None:
                raise serializers.ValidationError(
                    {"sku": _("Не удалось определить организацию для генерации SKU.")}
                )
            validated_data["sku"] = self._generate_unique_sku(organization)
        else:
            validated_data["sku"] = sku
        with transaction.atomic():
            product = super().create(validated_data)
            if variants_data:
                self._sync_variants(product, variants_data)
        return product

    def update(self, instance, validated_data):  # type: ignore[override]
        variants_data = validated_data.pop("variants", None)
        if "sku" in validated_data:
            sku = (validated_data.get("sku") or "").strip()
            if not sku:
                raise serializers.ValidationError({"sku": _("SKU не может быть пустым.")})
            validated_data["sku"] = sku
        if "is_active" in validated_data and "status" not in validated_data:
            validated_data["status"] = (
                models.Product.Status.ACTIVE
                if validated_data.get("is_active")
                else models.Product.Status.INACTIVE
            )
        with transaction.atomic():
            product = super().update(instance, validated_data)
            if variants_data is not None:
                self._sync_variants(product, variants_data)
        return product

    def _sync_variants(self, product: models.Product, variants_data: list[dict[str, Any]]):
        existing_variants = {variant.id: variant for variant in product.variants.all()}
        seen_ids: set[int] = set()
        request = self.context.get("request") if hasattr(self, "context") else None
        recorded_by = None
        if request is not None:
            user = getattr(request, "user", None)
            if getattr(user, "is_authenticated", False):
                recorded_by = user

        default_requested = False
        for payload in variants_data:
            variant_id = payload.get("id")
            payload = dict(payload)
            payload.pop("product", None)
            if payload.get("is_default"):
                if default_requested:
                    raise serializers.ValidationError(
                        {"variants": _("Укажите только один вариант по умолчанию.")}
                    )
                default_requested = True

            if variant_id is None:
                serializer = NestedProductVariantSerializer(data=payload, context=self.context)
                serializer.is_valid(raise_exception=True)
                variant = serializer.save(product=product, recorded_by=recorded_by)
                seen_ids.add(variant.id)
                continue

            variant = existing_variants.get(variant_id)
            if not variant:
                raise serializers.ValidationError(
                    {"variants": _("Вариант с указанным идентификатором не найден.")}
                )
            serializer = NestedProductVariantSerializer(
                variant, data=payload, partial=True, context=self.context
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(recorded_by=recorded_by)
            seen_ids.add(variant_id)

        to_delete = [pk for pk in existing_variants if pk not in seen_ids]
        if to_delete:
            models.ProductVariant.objects.filter(pk__in=to_delete).delete()

        if not variants_data:
            return

        if not default_requested and not product.variants.filter(is_default=True).exists():
            fallback = product.variants.order_by("id").first()
            if fallback:
                product.variants.exclude(pk=fallback.pk).update(is_default=False)
                if not fallback.is_default:
                    fallback.is_default = True
                    fallback.save(update_fields=["is_default", "updated_at"])

    @staticmethod
    def _generate_unique_sku(organization, length: int = 10, attempts: int = 20) -> str:
        alphabet = string.ascii_uppercase + string.digits
        for _ in range(attempts):
            candidate = "".join(secrets.choice(alphabet) for _ in range(length))
            if not models.Product.objects.filter(organization=organization, sku=candidate).exists():
                return candidate
        raise serializers.ValidationError(
            {"sku": _("Не удалось автоматически сгенерировать уникальный SKU. Укажите его вручную.")}
        )


class InventoryLotSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InventoryLot
        fields = [
            "id",
            "variant",
            "supplier",
            "quantity",
            "received_at",
            "expires_at",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PriceHistorySerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    variant_name = serializers.CharField(source="variant.name", read_only=True)

    class Meta:
        model = models.PriceHistory
        fields = [
            "id",
            "variant",
            "variant_sku",
            "variant_name",
            "price",
            "currency",
            "recorded_at",
            "recorded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "recorded_at",
            "recorded_by",
            "variant_sku",
            "variant_name",
            "created_at",
            "updated_at",
        ]
