"""Service helpers for provisioning tenant accounts."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from simplycrm.core import models


@dataclass
class ProvisioningResult:
    """Details about a freshly provisioned tenant account."""

    user: models.User
    organization: models.Organization
    subscription: models.Subscription | None


def _unique_slug(base_name: str) -> str:
    """Generate a unique slug derived from the provided name."""

    base_slug = slugify(base_name) or "organization"
    base_slug = base_slug[: models.Organization._meta.get_field("slug").max_length]

    slug = base_slug
    suffix = 1
    while models.Organization.objects.filter(slug=slug).exists():
        candidate = f"{base_slug}-{suffix}"
        slug = candidate[: models.Organization._meta.get_field("slug").max_length]
        suffix += 1
    return slug


@transaction.atomic
def provision_tenant_account(
    *,
    username: str,
    email: str,
    organization_name: str,
    first_name: str = "",
    last_name: str = "",
    password: str | None = None,
    plan_key: str | None = None,
    start_date: date | None = None,
) -> ProvisioningResult:
    """Create an organization, user and optional subscription in a single transaction."""

    organization = models.Organization.objects.create(
        name=organization_name,
        slug=_unique_slug(organization_name),
    )

    user_model = get_user_model()
    user = user_model(
        username=username,
        email=email,
        organization=organization,
        first_name=first_name,
        last_name=last_name,
    )

    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()

    user.full_clean()
    user.save()

    subscription = None
    plan_lookup = plan_key or models.SubscriptionPlan.FREE
    plan = (
        models.SubscriptionPlan.objects.filter(key=plan_lookup).first()
        or models.SubscriptionPlan.objects.first()
    )
    if plan:
        subscription = models.Subscription.objects.create(
            organization=organization,
            plan=plan,
            started_at=start_date or timezone.now().date(),
        )

    return ProvisioningResult(user=user, organization=organization, subscription=subscription)
