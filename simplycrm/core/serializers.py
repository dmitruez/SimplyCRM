"""Serializers for core models."""
from __future__ import annotations

from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers
from simplycrm.core import models
from simplycrm.core.services import finalize_invite_acceptance, provision_local_account


class EmptySerializer(serializers.Serializer):
	"""Serializer that represents an empty payload."""
	
	pass


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


class WorkspaceDetails(serializers.Serializer):
	"""Aggregate workspace information for authenticated clients."""
	
	organization = OrganizationSerializer()
	subscription = SubscriptionSerializer(allow_null=True)
	feature_flags = FeatureFlagSerializer(many=True)


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
    title = serializers.CharField(allow_blank=True)
    timezone = serializers.CharField()
    locale = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    organization = serializers.SerializerMethodField()
    feature_flags = serializers.SerializerMethodField()

    def get_organization(self, obj):  # noqa: D401 - serializer hook
        organization = getattr(obj, "organization", None)
        if not organization:
            return None
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


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["first_name", "last_name", "email", "title", "timezone", "locale"]


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    invite_token = serializers.CharField(required=False, allow_blank=True, max_length=128)
    plan_key = serializers.ChoiceField(
        choices=models.SubscriptionPlan.PLAN_CHOICES,
        required=False,
        allow_blank=True,
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

    def validate(self, attrs):  # type: ignore[override]
        organization_name = (attrs.get("organization_name") or "").strip()
        invite_token = (attrs.get("invite_token") or "").strip()

        attrs["organization_name"] = organization_name or None
        attrs["invite_token"] = invite_token or None

        if attrs["organization_name"] and attrs["invite_token"]:
            raise serializers.ValidationError(
                {"invite_token": "Нельзя одновременно создавать компанию и использовать приглашение."}
            )

        return super().validate(attrs)

    def create(self, validated_data):  # type: ignore[override]
        invite_token = validated_data.pop("invite_token", None)
        organization_name = validated_data.pop("organization_name", None)
        plan_key = validated_data.pop("plan_key", None) or models.SubscriptionPlan.FREE

        username = validated_data["username"]
        email = validated_data["email"]
        password = validated_data["password"]
        first_name = validated_data.get("first_name", "")
        last_name = validated_data.get("last_name", "")

        User = get_user_model()

        if invite_token:
            try:
                invite = models.OrganizationInvite.objects.select_related("organization").get(token=invite_token)
            except models.OrganizationInvite.DoesNotExist as exc:  # pragma: no cover - guard rail
                raise serializers.ValidationError({"invite_token": "Приглашение не найдено."}) from exc

            if not invite.is_active:
                raise serializers.ValidationError(
                    {"invite_token": "Срок действия приглашения истёк или оно уже было использовано."}
                )

            if invite.email and invite.email.lower() != email.lower():
                raise serializers.ValidationError(
                    {"email": "Email не совпадает с адресом, указанным в приглашении."}
                )

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                organization=invite.organization,
            )
            finalize_invite_acceptance(invite=invite, user=user)
            return user

        if organization_name:
            result = provision_local_account(
                username=username,
                email=email,
                password=password,
                organization_name=organization_name,
                first_name=first_name,
                last_name=last_name,
                plan_key=plan_key,
            )
            return result.user

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        return user


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField()
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    plan_key = serializers.ChoiceField(
        choices=models.SubscriptionPlan.PLAN_CHOICES, required=False, allow_blank=True
    )


class ExcelImportSerializer(serializers.Serializer):
    resource = serializers.ChoiceField(choices=[("contacts", "contacts"), ("products", "products")])
    file = serializers.FileField()

    def validate_file(self, file):  # type: ignore[override]
        name = getattr(file, "name", "")
        if not name or not name.lower().endswith((".xlsx", ".xls", ".csv")):
            raise serializers.ValidationError("Поддерживаются только файлы Excel или CSV.")
        max_size = 10 * 1024 * 1024
        if file.size and file.size > max_size:
            raise serializers.ValidationError("Размер файла не должен превышать 10 МБ.")
        return file


class OrganizationInviteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = models.OrganizationInvite
        fields = [
            "id",
            "organization",
            "email",
            "token",
            "role",
            "created_at",
            "expires_at",
            "accepted_at",
            "created_by_name",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "organization",
            "token",
            "created_at",
            "accepted_at",
            "created_by_name",
            "is_active",
        ]

    def get_created_by_name(self, obj):  # noqa: D401
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_is_active(self, obj):  # noqa: D401
        return obj.is_active


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)

    def validate(self, attrs):  # type: ignore[override]
        token = (attrs.get("token") or "").strip()
        if not token:
            raise serializers.ValidationError({"token": "Укажите код приглашения."})
        try:
            invite = models.OrganizationInvite.objects.select_related("organization", "created_by").get(token=token)
        except models.OrganizationInvite.DoesNotExist as exc:  # pragma: no cover - guard rail
            raise serializers.ValidationError({"token": "Приглашение не найдено."}) from exc

        if not invite.is_active:
            raise serializers.ValidationError({"token": "Приглашение уже использовано или истекло."})

        attrs["invite"] = invite
        attrs["token"] = token
        return attrs
