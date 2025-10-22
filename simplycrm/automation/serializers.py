"""Serializers for automation models."""
from __future__ import annotations

from rest_framework import serializers

from simplycrm.automation import models


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AutomationRule
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "trigger",
            "conditions",
            "actions",
            "is_active",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CampaignStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CampaignStep
        fields = ["id", "campaign", "step_type", "position", "payload", "delay_minutes"]
        read_only_fields = ["id"]


class CampaignSerializer(serializers.ModelSerializer):
    steps = CampaignStepSerializer(many=True, read_only=True)

    class Meta:
        model = models.Campaign
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "status",
            "audience_definition",
            "start_at",
            "end_at",
            "created_by",
            "steps",
        ]
        read_only_fields = ["id"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Notification
        fields = [
            "id",
            "organization",
            "recipient",
            "channel",
            "template",
            "payload",
            "scheduled_at",
            "sent_at",
            "status",
        ]
        read_only_fields = ["id", "sent_at"]


class WebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.WebhookEvent
        fields = [
            "id",
            "organization",
            "url",
            "event_type",
            "headers",
            "payload",
            "status",
            "last_response_code",
            "created_at",
            "delivered_at",
        ]
        read_only_fields = ["id", "created_at", "delivered_at"]
