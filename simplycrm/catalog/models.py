"""Product catalog and inventory models."""
from __future__ import annotations

from django.conf import settings
from django.db import models


class Category(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")

    class Meta:
        unique_together = ("organization", "slug")
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Supplier(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="suppliers")
    name = models.CharField(max_length=255)
    contact_email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Product(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("organization", "sku")
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    attributes = models.JSONField(default=dict, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ("product", "sku")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.product.name} / {self.name}"


class InventoryLot(models.Model):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="inventory_lots")
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name="inventory_lots")
    quantity = models.PositiveIntegerField()
    received_at = models.DateField()
    expires_at = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"Lot for {self.variant}"


class PriceHistory(models.Model):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="price_history")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.variant} @ {self.price}"
