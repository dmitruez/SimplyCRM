"""Admin registrations for the assistant app."""
from __future__ import annotations

from django.contrib import admin
from simplycrm.assistant import models


@admin.register(models.AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
	list_display = ("title", "organization", "owner", "updated_at")
	search_fields = ("title", "owner__username", "organization__name")
	list_filter = ("organization",)


@admin.register(models.AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
	list_display = ("conversation", "role", "created_at", "token_usage")
	search_fields = ("conversation__title", "content")
	list_filter = ("role",)
