"""Serializers for integration models."""
from __future__ import annotations

from rest_framework import serializers
from simplycrm.integrations import models


class ApiKeySerializer(serializers.ModelSerializer):
	class Meta:
		model = models.ApiKey
		fields = ["id", "organization", "name", "key", "permissions", "created_at", "last_used_at"]
		read_only_fields = ["id", "created_at", "last_used_at"]


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.WebhookSubscription
		fields = ["id", "organization", "url", "event_types", "secret", "is_active", "created_at"]
		read_only_fields = ["id", "created_at"]


class IntegrationConnectionSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.IntegrationConnection
		fields = ["id", "organization", "provider", "config", "status", "last_synced_at"]
		read_only_fields = ["id", "last_synced_at"]


class IntegrationLogSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.IntegrationLog
		fields = ["id", "connection", "level", "message", "payload", "created_at"]
		read_only_fields = ["id", "created_at"]


class ImportJobSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.ImportJob
		fields = ["id", "organization", "data_source", "status", "started_at", "completed_at", "statistics"]
		read_only_fields = ["id", "started_at", "completed_at"]
