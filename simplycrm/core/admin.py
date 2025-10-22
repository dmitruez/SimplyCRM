from __future__ import annotations

from django.contrib import admin

from simplycrm.core import models


@admin.register(models.Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")


@admin.register(models.SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "price_per_month", "max_users", "max_deals")
    search_fields = ("name", "key")


@admin.register(models.FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")
    filter_horizontal = ("plans",)


@admin.register(models.Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("organization", "plan", "started_at", "expires_at", "is_active")
    list_filter = ("plan", "is_active")


@admin.register(models.User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "organization", "is_active")
    list_filter = ("organization", "is_active")
    search_fields = ("username", "email")


@admin.register(models.UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "assigned_at")
    list_filter = ("role",)


@admin.register(models.AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity", "user", "created_at")
    search_fields = ("action", "entity")
    list_filter = ("organization",)
