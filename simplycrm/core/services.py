"""Core domain services for account provisioning and onboarding."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify

from simplycrm.core import models


@dataclass(frozen=True)
class WorkspaceDetails:
    """Container describing a provisioned organization and the associated user."""

    organization: models.Organization
    user: models.User
    created: bool


def _determine_workspace_name(email: str, requested_name: str | None) -> str:
    if requested_name:
        candidate = requested_name.strip()
        if candidate:
            return candidate
    local_part = email.split("@", 1)[0]
    return f"{local_part.title()} Workspace"


def _generate_unique_slug(name: str) -> str:
    base_slug = slugify(name) or "workspace"
    if not models.Organization.objects.filter(slug=base_slug).exists():
        return base_slug
    index = 2
    while True:
        candidate = f"{base_slug}-{index}"
        if not models.Organization.objects.filter(slug=candidate).exists():
            return candidate
        index += 1


def _ensure_free_subscription(organization: models.Organization) -> None:
    plan = models.SubscriptionPlan.objects.filter(key=models.SubscriptionPlan.FREE).first()
    if not plan:
        return
    organization.subscriptions.get_or_create(
        plan=plan,
        defaults={
            "started_at": date.today(),
            "is_active": True,
        },
    )


def _unique_org_name(candidate: str) -> str:
    if not models.Organization.objects.filter(name=candidate).exists():
        return candidate
    index = 2
    while True:
        renamed = f"{candidate} #{index}"
        if not models.Organization.objects.filter(name=renamed).exists():
            return renamed
        index += 1


def provision_local_account(
    *,
    email: str,
    password: str,
    first_name: str = "",
    last_name: str = "",
    organization_name: str | None = None,
) -> WorkspaceDetails:
    """Create a brand-new organization and user for password-based signups."""

    email = email.lower()
    validate_password(password)
    workspace_name = _determine_workspace_name(email, organization_name)

    unique_name = _unique_org_name(workspace_name)
    slug = _generate_unique_slug(unique_name)

    with transaction.atomic():
        organization = models.Organization.objects.create(name=unique_name, slug=slug)
        _ensure_free_subscription(organization)

        user_model = get_user_model()
        user = user_model.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            organization=organization,
        )

    return WorkspaceDetails(organization=organization, user=user, created=True)


def provision_google_account(
    *,
    email: str,
    first_name: str = "",
    last_name: str = "",
    organization_name: str | None = None,
) -> WorkspaceDetails:
    """Create or update a user authenticated via Google OAuth."""

    email = email.lower()
    user_model = get_user_model()

    with transaction.atomic():
        try:
            user = user_model.objects.select_for_update().get(email__iexact=email)
            created = False
        except user_model.DoesNotExist:
            workspace_name = _determine_workspace_name(email, organization_name)
            unique_name = _unique_org_name(workspace_name)
            slug = _generate_unique_slug(unique_name)
            organization = models.Organization.objects.create(name=unique_name, slug=slug)
            _ensure_free_subscription(organization)

            user = user_model.objects.create_user(
                username=email,
                email=email,
                password=None,
                first_name=first_name,
                last_name=last_name,
                organization=organization,
            )
            created = True
            return WorkspaceDetails(organization=organization, user=user, created=created)

        organization = user.organization
        if organization is None:
            workspace_name = _determine_workspace_name(email, organization_name)
            unique_name = _unique_org_name(workspace_name)
            slug = _generate_unique_slug(unique_name)
            organization = models.Organization.objects.create(name=unique_name, slug=slug)
            _ensure_free_subscription(organization)
            user.organization = organization
            updated_fields = ["organization"]
        else:
            updated_fields: list[str] = []

        if first_name and user.first_name != first_name:
            user.first_name = first_name
            updated_fields.append("first_name")
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            updated_fields.append("last_name")
        if user.email != email:
            user.email = email
            updated_fields.append("email")
        if user.username != email:
            user.username = email
            updated_fields.append("username")

        if updated_fields:
            user.save(update_fields=updated_fields)

    return WorkspaceDetails(organization=organization, user=user, created=False)

