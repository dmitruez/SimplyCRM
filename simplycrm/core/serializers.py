"""Serializers for core models."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from simplycrm.core import models


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Organization
        fields = ["id", "name", "slug", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SubscriptionPlan
        fields = [
            "id",
            "key",
            "name",
            "description",
            "price_per_month",
            "max_users",
            "max_deals",
            "max_api_calls_per_minute",
        ]
        read_only_fields = ["id"]


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.FeatureFlag
        fields = ["id", "code", "name", "description", "plans"]
        read_only_fields = ["id"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=models.SubscriptionPlan.objects.all(), source="plan", write_only=True
    )

    class Meta:
        model = models.Subscription
        fields = ["id", "organization", "plan", "plan_id", "started_at", "expires_at", "is_active"]
        read_only_fields = ["id", "organization"]


class UserSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Organization.objects.all(), source="organization", write_only=True, required=False
    )

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "organization",
            "organization_id",
            "title",
            "timezone",
            "locale",
            "is_active",
            "is_staff",
        ]
        read_only_fields = ["id"]


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.UserRole
        fields = ["id", "user", "role", "assigned_at"]
        read_only_fields = ["id", "assigned_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AuditLog
        fields = ["id", "organization", "user", "action", "entity", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]
