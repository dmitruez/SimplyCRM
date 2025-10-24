"""Automation and notifications models."""
from __future__ import annotations

from django.conf import settings
from django.db import models


class AutomationRule(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="automation_rules")
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	trigger = models.CharField(max_length=128)
	conditions = models.JSONField(default=dict, blank=True)
	actions = models.JSONField(default=list, blank=True)
	is_active = models.BooleanField(default=True)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
	created_at = models.DateTimeField(auto_now_add=True)


class Campaign(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="campaigns")
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	status = models.CharField(max_length=32, default="draft")
	audience_definition = models.JSONField(default=dict, blank=True)
	start_at = models.DateTimeField(null=True, blank=True)
	end_at = models.DateTimeField(null=True, blank=True)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)


class CampaignStep(models.Model):
	campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="steps")
	step_type = models.CharField(max_length=64)
	position = models.PositiveIntegerField(default=0)
	payload = models.JSONField(default=dict, blank=True)
	delay_minutes = models.PositiveIntegerField(default=0)
	
	
	class Meta:
		ordering = ["position"]


class Notification(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="notifications")
	recipient = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
	channel = models.CharField(max_length=32)
	template = models.CharField(max_length=128)
	payload = models.JSONField(default=dict, blank=True)
	scheduled_at = models.DateTimeField(null=True, blank=True)
	sent_at = models.DateTimeField(null=True, blank=True)
	status = models.CharField(max_length=32, default="pending")


class WebhookEvent(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="webhook_events")
	url = models.URLField()
	event_type = models.CharField(max_length=64)
	headers = models.JSONField(default=dict, blank=True)
	payload = models.JSONField(default=dict, blank=True)
	status = models.CharField(max_length=32, default="pending")
	last_response_code = models.IntegerField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	delivered_at = models.DateTimeField(null=True, blank=True)
