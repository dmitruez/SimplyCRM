from __future__ import annotations

from django.contrib import admin
from simplycrm.automation import models


@admin.register(models.AutomationRule)
class AutomationRuleAdmin(admin.ModelAdmin):
	list_display = ("name", "organization", "trigger", "is_active", "created_at")
	list_filter = ("organization", "is_active")


class CampaignStepInline(admin.TabularInline):
	model = models.CampaignStep
	extra = 0


@admin.register(models.Campaign)
class CampaignAdmin(admin.ModelAdmin):
	list_display = ("name", "organization", "status", "start_at", "end_at")
	inlines = [CampaignStepInline]


@admin.register(models.Notification)
class NotificationAdmin(admin.ModelAdmin):
	list_display = ("organization", "channel", "template", "status", "scheduled_at", "sent_at")


@admin.register(models.WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
	list_display = ("organization", "event_type", "status", "created_at", "delivered_at")
