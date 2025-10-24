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
	
	
	class Meta:
		model = models.Product
		fields = ["id", "organization", "category", "name", "sku", "description", "is_active", "variants"]
		read_only_fields = ["id"]


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
