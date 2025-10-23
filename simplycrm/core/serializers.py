"""Serializers for core models."""
from __future__ import annotations

from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

from simplycrm.core.services import (
    WorkspaceDetails,
    provision_google_account,
    provision_local_account,
)

from simplycrm.core import models
from simplycrm.core.services import provision_tenant_account


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


class AuthTokenSerializer(serializers.Serializer):
    """Validate credentials for token-based authentication."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):  # type: ignore[override]
        attrs["username"] = attrs["username"].strip()
        if not attrs["username"] or not attrs["password"]:
            raise serializers.ValidationError("Both username and password are required.")
        return attrs


class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    organization = serializers.SerializerMethodField()
    feature_flags = serializers.SerializerMethodField()

    def get_organization(self, obj):  # noqa: D401 - serializer hook
        organization = obj.organization
        return {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
        }

    def get_feature_flags(self, obj):  # noqa: D401
        enabled_codes = obj.feature_codes()
        return [
            {
                "code": flag.code,
                "name": flag.name,
                "description": flag.description,
                "enabled": flag.code in enabled_codes,
            }
            for flag in models.FeatureFlag.objects.all()
        ]


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    organization_name = serializers.CharField(max_length=255)
    plan_key = serializers.ChoiceField(
        choices=models.SubscriptionPlan.PLAN_CHOICES, required=False, allow_blank=True
    )

    def validate_username(self, value):  # type: ignore[override]
        User = get_user_model()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already in use.")
        return value

    def validate_email(self, value):  # type: ignore[override]
        User = get_user_model()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value

    def validate_password(self, value):  # type: ignore[override]
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):  # type: ignore[override]
        result = provision_tenant_account(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            organization_name=validated_data["organization_name"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            plan_key=validated_data.get("plan_key") or models.SubscriptionPlan.FREE,
        )
        return result.user


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField()
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    plan_key = serializers.ChoiceField(
        choices=models.SubscriptionPlan.PLAN_CHOICES, required=False, allow_blank=True
    )
