from django.contrib import admin

from simplycrm.catalog import models


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "parent", "is_active")
    search_fields = ("name", "slug")
    list_filter = ("organization", "is_active")
    readonly_fields = ("created_at", "updated_at", "path")


@admin.register(models.Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "contact_email", "phone_number")
    search_fields = ("name", "contact_email", "phone_number")
    list_filter = ("organization",)
    readonly_fields = ("created_at", "updated_at")


class ProductVariantInline(admin.TabularInline):
    model = models.ProductVariant
    extra = 0
    fields = (
        "name",
        "sku",
        "price",
        "currency",
        "cost",
        "status",
        "is_default",
        "updated_at",
    )
    readonly_fields = ("updated_at",)


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "sku",
        "category",
        "status",
        "is_active",
        "published_at",
    )
    search_fields = ("name", "sku", "slug")
    list_filter = ("organization", "status", "is_active")
    readonly_fields = ("created_at", "updated_at", "published_at")
    inlines = [ProductVariantInline]


@admin.register(models.InventoryLot)
class InventoryLotAdmin(admin.ModelAdmin):
    list_display = (
        "variant",
        "quantity",
        "received_at",
        "expires_at",
        "supplier",
    )
    list_filter = ("supplier", "received_at")
    search_fields = ("variant__name", "variant__sku")
    readonly_fields = ("created_at", "updated_at")


@admin.register(models.PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ("variant", "price", "currency", "recorded_at", "recorded_by")
    list_filter = ("currency", "recorded_at")
    search_fields = ("variant__name", "variant__sku")
    readonly_fields = ("created_at", "updated_at")
