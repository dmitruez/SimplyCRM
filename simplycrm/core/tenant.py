"""Helpers for resolving the active organization within a request cycle."""
from __future__ import annotations

from contextvars import ContextVar
from typing import Optional

from . import models


_active_organization: ContextVar[Optional[models.Organization]] = ContextVar(
    "simplycrm_active_organization", default=None
)


def activate(organization: Optional[models.Organization]):
    """Bind the provided organization to the current execution context."""
    return _active_organization.set(organization)


def deactivate(token) -> None:
    """Restore the previously active organization."""
    _active_organization.reset(token)


def get_active_organization(
    default: Optional[models.Organization] | None = None,
) -> Optional[models.Organization]:
    """Return the organization active for the current context."""
    organization = _active_organization.get()
    return organization or default


def get_request_organization(request) -> Optional[models.Organization]:
    """Resolve the organization for the provided request."""
    organization = get_active_organization()
    if organization is not None:
        return organization
    organization = getattr(request, "active_organization", None)
    if organization is None and hasattr(request, "_request"):
        organization = getattr(request._request, "active_organization", None)
    if organization is not None:
        return organization
    user = getattr(request, "user", None)
    if user is None and hasattr(request, "_request"):
        user = getattr(request._request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return None
    header_org = _resolve_header_organization(request)
    if header_org and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
        return header_org
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        query_org = _resolve_query_organization(request)
        if query_org is not None:
            return query_org
        session_org = _resolve_session_organization(request)
        if session_org is not None:
            return session_org
    return getattr(user, "organization", None)


def get_request_organization_id(request) -> int | None:
    """Return the identifier of the organization bound to the request."""
    organization = get_request_organization(request)
    return organization.id if organization else None


def _resolve_header_organization(request) -> Optional[models.Organization]:
    header_value = None
    if hasattr(request, "headers"):
        header_value = request.headers.get("X-Organization-Id")
    if not header_value and hasattr(request, "META"):
        header_value = request.META.get("HTTP_X_ORGANIZATION_ID")
    if header_value:
        try:
            return models.Organization.objects.get(pk=int(header_value))
        except (models.Organization.DoesNotExist, ValueError, TypeError):
            return None
    slug_value = None
    if hasattr(request, "headers"):
        slug_value = request.headers.get("X-Organization-Slug")
    if not slug_value and hasattr(request, "META"):
        slug_value = request.META.get("HTTP_X_ORGANIZATION_SLUG")
    if slug_value:
        try:
            return models.Organization.objects.get(slug=slug_value)
        except models.Organization.DoesNotExist:
            return None
    return None


def _resolve_query_organization(request) -> Optional[models.Organization]:
    params = getattr(request, "query_params", None)
    if params is None and hasattr(request, "GET"):
        params = request.GET
    if not params:
        return None

    raw_id = params.get("organization_id")
    if raw_id not in (None, ""):
        try:
            return models.Organization.objects.get(pk=int(raw_id))
        except (ValueError, TypeError, models.Organization.DoesNotExist):
            return None

    slug_value = params.get("organization_slug") if hasattr(params, "get") else None
    if slug_value:
        try:
            return models.Organization.objects.get(slug=slug_value)
        except models.Organization.DoesNotExist:
            return None
    return None


def _resolve_session_organization(request) -> Optional[models.Organization]:
    session = getattr(request, "session", None)
    if not session:
        return None
    raw_id = session.get("active_organization_id")
    if raw_id in (None, ""):
        return None
    try:
        return models.Organization.objects.get(pk=int(raw_id))
    except (ValueError, TypeError, models.Organization.DoesNotExist):
        return None
