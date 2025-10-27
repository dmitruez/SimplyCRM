"""Core domain models: organizations, users, subscriptions and feature flags."""
from __future__ import annotations

from datetime import date
from typing import Iterable

from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.core.validators import MinValueValidator
from django.db import models


class Organization(models.Model):
	"""A tenant that owns CRM data."""
	
	name = models.CharField(max_length=255, unique=True)
	slug = models.SlugField(max_length=255, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	def __str__(self) -> str:  # pragma: no cover - repr helper
		return self.name


class SubscriptionPlan(models.Model):
	"""Commercial offering with feature entitlements and limits."""
	
	FREE = "free"
	PRO = "pro"
	ENTERPRISE = "enterprise"
	
	PLAN_CHOICES = [
		(FREE, "Free"),
		(PRO, "Pro"),
		(ENTERPRISE, "Enterprise"),
	]
	
	key = models.CharField(max_length=32, choices=PLAN_CHOICES, unique=True)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	price_per_month = models.DecimalField(max_digits=9, decimal_places=2, validators=[MinValueValidator(0)])
	max_users = models.PositiveIntegerField(default=5)
	max_deals = models.PositiveIntegerField(default=500)
	max_api_calls_per_minute = models.PositiveIntegerField(default=120)
	
	def __str__(self) -> str:  # pragma: no cover
		return self.name


class FeatureFlag(models.Model):
	"""Fine-grained access control for plan capabilities."""
	
	code = models.CharField(max_length=64, unique=True)
	name = models.CharField(max_length=128)
	description = models.TextField(blank=True)
	plans = models.ManyToManyField(SubscriptionPlan, related_name="feature_flags", blank=True)
	
	
	class Meta:
		ordering = ["code"]
	
	
	def __str__(self) -> str:  # pragma: no cover
		return self.code


class Subscription(models.Model):
	"""Active subscription binding a plan to an organization."""
	
	organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="subscriptions")
	plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
	started_at = models.DateField()
	expires_at = models.DateField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	
	
	class Meta:
		ordering = ["-started_at"]
	
	
	def __str__(self) -> str:  # pragma: no cover
		return f"{self.organization} → {self.plan}"
	
	def has_feature(self, feature_code: str) -> bool:
		return self.plan.feature_flags.filter(code=feature_code).exists()
	
	def is_valid_on(self, day: date) -> bool:
		if not self.is_active:
			return False
		if self.expires_at and day > self.expires_at:
			return False
		return self.started_at <= day


class OrganizationAwareUserManager(UserManager):
	"""Ensure users are always tied to an organization.

	``createsuperuser`` now provisions a default tenant when one is not
	supplied so bootstrap setups do not fail with ``Organization.DoesNotExist``.
	"""
	
	def _normalize_organization(self, organization: Organization | int | None) -> Organization:
		if organization is None:
			raise ValueError("Users must be associated with an organization.")
		if isinstance(organization, int):
			return Organization.objects.get(pk=organization)
		return organization
	
	def create_user(self, username, email=None, password=None, **extra_fields):  # type: ignore[override]
		organization = self._normalize_organization(extra_fields.pop("organization", None))
		user = self.model(
			username=username,
			email=self.normalize_email(email),
			organization=organization,
			**extra_fields,
		)
		user.set_password(password)
		user.save(using=self._db)
		return user
	
	def create_superuser(self, username, email=None, password=None, **extra_fields):  # type: ignore[override]
		extra_fields.setdefault("is_staff", True)
		extra_fields.setdefault("is_superuser", True)
		extra_fields.setdefault("is_active", True)
		
		if extra_fields.get("is_staff") is not True:
			raise ValueError("Superuser must have is_staff=True.")
		if extra_fields.get("is_superuser") is not True:
			raise ValueError("Superuser must have is_superuser=True.")
		
		organization = extra_fields.pop("organization", None)
		if organization is None:
			organization, _ = Organization.objects.get_or_create(
				slug="global-admin",
				defaults={"name": "Global Admin"},
			)
		else:
			organization = self._normalize_organization(organization)
		
		return super().create_superuser(
			username,
			email=email,
			password=password,
			organization=organization,
			**extra_fields,
		)


class User(AbstractUser):
	"""Custom user bound to an organization."""
	
	organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="users")
	title = models.CharField(max_length=255, blank=True)
	timezone = models.CharField(max_length=64, default="UTC")
	locale = models.CharField(max_length=16, default="en-US")
	
	REQUIRED_FIELDS: Iterable[str] = ["email"]
	
	objects = OrganizationAwareUserManager()
	
	def feature_codes(self) -> set[str]:
		active_subscription = self.organization.subscriptions.filter(is_active=True).order_by("-started_at").first()
		codes: set[str] = set()
		if active_subscription:
			codes.update(active_subscription.plan.feature_flags.values_list("code", flat=True))
		if self.is_staff or self.is_superuser:
			codes.add("admin.panel")
		return codes
	
	def has_feature(self, feature_code: str) -> bool:
		return feature_code in self.feature_codes()


class UserRole(models.Model):
	"""Role-based access control for organization members."""
	
	ADMIN = "admin"
	MANAGER = "manager"
	ANALYST = "analyst"
	MARKETER = "marketer"
	
	ROLE_CHOICES = [
		(ADMIN, "Admin"),
		(MANAGER, "Manager"),
		(ANALYST, "Analyst"),
		(MARKETER, "Marketer"),
	]
	
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roles")
	role = models.CharField(max_length=32, choices=ROLE_CHOICES)
	assigned_at = models.DateTimeField(auto_now_add=True)
	
	
	class Meta:
		unique_together = ("user", "role")
	
	
	def __str__(self) -> str:  # pragma: no cover
		return f"{self.user} → {self.role}"


class AuditLog(models.Model):
	"""Tracks significant user actions for compliance."""
	
	organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="audit_logs")
	user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
	action = models.CharField(max_length=255)
	entity = models.CharField(max_length=255)
	metadata = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	
	
	class Meta:
		ordering = ["-created_at"]
	
	
	def __str__(self) -> str:  # pragma: no cover
		return f"{self.action} on {self.entity}"
