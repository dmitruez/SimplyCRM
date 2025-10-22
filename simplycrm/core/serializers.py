"""Serializers for core models."""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import serializers

from simplycrm.core.services import (
    WorkspaceDetails,
    provision_google_account,
    provision_local_account,
)

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


class AuthTokenSerializer(serializers.Serializer):
    """Validate credentials for token-based authentication."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):  # type: ignore[override]
        attrs["username"] = attrs["username"].strip()
        if not attrs["username"] or not attrs["password"]:
            raise serializers.ValidationError("Both username and password are required.")
        return attrs


class EmptySerializer(serializers.Serializer):
    """Placeholder serializer for endpoints that do not accept payloads."""

    pass


class RegistrationSerializer(serializers.Serializer):
    """Collect minimal information required to provision a new user account."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    _workspace: WorkspaceDetails | None = None

    def validate_email(self, value: str) -> str:
        user_model = get_user_model()
        if user_model.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("An account with this email already exists."))
        return value.lower()

    def create(self, validated_data):  # type: ignore[override]
        try:
            details = provision_local_account(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                organization_name=validated_data.get("organization_name"),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc

        self._workspace = details
        return details.user

    @property
    def workspace(self) -> WorkspaceDetails:
        if self._workspace is None:  # pragma: no cover - defensive programming
            raise AttributeError("workspace is not available until save() is called")
        return self._workspace


class GoogleAuthSerializer(serializers.Serializer):
    """Validate a Google ID token and provision the corresponding user."""

    token = serializers.CharField(write_only=True)
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    _workspace: WorkspaceDetails | None = None

    def validate(self, attrs):  # type: ignore[override]
        request = google_requests.Request()
        try:
            id_info = google_id_token.verify_oauth2_token(attrs["token"], request)
        except (ValueError, google_exceptions.GoogleAuthError) as exc:  # pragma: no cover - network/invalid token path
            raise serializers.ValidationError({"token": _("Invalid or expired Google token.")}) from exc

        client_ids = getattr(settings, "GOOGLE_OAUTH_CLIENT_IDS", [])
        if client_ids:
            audience = id_info.get("aud")
            if isinstance(audience, str):
                valid_audience = audience in client_ids
            else:
                valid_audience = bool(set(client_ids) & set(audience or []))
            if not valid_audience:
                raise serializers.ValidationError({"token": _("Google token audience is not allowed.")})

        email = id_info.get("email")
        if not email:
            raise serializers.ValidationError({"token": _("Google account does not expose an email address.")})
        if not id_info.get("email_verified", True):
            raise serializers.ValidationError({"token": _("Google email address is not verified.")})

        attrs["id_info"] = id_info
        return attrs

    def create(self, validated_data):  # type: ignore[override]
        id_info = validated_data.pop("id_info")
        details = provision_google_account(
            email=id_info["email"],
            first_name=id_info.get("given_name", ""),
            last_name=id_info.get("family_name", ""),
            organization_name=validated_data.get("organization_name"),
        )
        self._workspace = details
        return details.user

    @property
    def workspace(self) -> WorkspaceDetails:
        if self._workspace is None:  # pragma: no cover - defensive programming
            raise AttributeError("workspace is not available until save() is called")
        return self._workspace

