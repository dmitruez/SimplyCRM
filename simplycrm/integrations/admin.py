from __future__ import annotations

from django.contrib import admin

from simplycrm.integrations import models


@admin.register(models.ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "created_at", "last_used_at")
    search_fields = ("name", "key")


@admin.register(models.WebhookSubscription)
class WebhookSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("organization", "url", "is_active", "created_at")


@admin.register(models.IntegrationConnection)
class IntegrationConnectionAdmin(admin.ModelAdmin):
    list_display = ("organization", "provider", "status", "last_synced_at")


@admin.register(models.IntegrationLog)
class IntegrationLogAdmin(admin.ModelAdmin):
    list_display = ("connection", "level", "created_at")
    list_filter = ("level",)


@admin.register(models.ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ("organization", "data_source", "status", "started_at", "completed_at")
