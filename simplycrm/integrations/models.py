"""Integration models for external systems."""
from __future__ import annotations

from django.db import models


class ApiKey(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="api_keys")
	name = models.CharField(max_length=255)
	key = models.CharField(max_length=128, unique=True)
	permissions = models.JSONField(default=list, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	last_used_at = models.DateTimeField(null=True, blank=True)


class WebhookSubscription(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE,
	                                 related_name="webhook_subscriptions")
	url = models.URLField()
	event_types = models.JSONField(default=list, blank=True)
	secret = models.CharField(max_length=128, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)


class IntegrationConnection(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE,
	                                 related_name="integration_connections")
	provider = models.CharField(max_length=64)
	config = models.JSONField(default=dict, blank=True)
	status = models.CharField(max_length=32, default="disconnected")
	last_synced_at = models.DateTimeField(null=True, blank=True)


class IntegrationLog(models.Model):
	connection = models.ForeignKey(IntegrationConnection, on_delete=models.CASCADE, related_name="logs")
	level = models.CharField(max_length=32)
	message = models.TextField()
	payload = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)


class ImportJob(models.Model):
	organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="import_jobs")
	data_source = models.CharField(max_length=128)
	status = models.CharField(max_length=32, default="pending")
	started_at = models.DateTimeField(auto_now_add=True)
	completed_at = models.DateTimeField(null=True, blank=True)
	statistics = models.JSONField(default=dict, blank=True)
