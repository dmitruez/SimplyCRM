from __future__ import annotations

from django.contrib import admin

from simplycrm.catalog import models


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "parent")
    search_fields = ("name", "slug")
    list_filter = ("organization",)


@admin.register(models.Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "contact_email")
    search_fields = ("name", "contact_email")


class ProductVariantInline(admin.TabularInline):
    model = models.ProductVariant
    extra = 0


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "sku", "category", "is_active")
    search_fields = ("name", "sku")
    list_filter = ("organization", "is_active")
    inlines = [ProductVariantInline]


@admin.register(models.InventoryLot)
class InventoryLotAdmin(admin.ModelAdmin):
    list_display = ("variant", "quantity", "received_at", "expires_at", "supplier")
    list_filter = ("supplier", "received_at")


@admin.register(models.PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ("variant", "price", "currency", "recorded_at")
    list_filter = ("currency",)
