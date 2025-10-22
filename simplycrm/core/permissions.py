"""Custom DRF permissions built on top of feature flags."""
from __future__ import annotations

from rest_framework.permissions import BasePermission


class HasFeaturePermission(BasePermission):
    """Grants access if the authenticated user has a feature flag."""

    feature_code: str | None = None

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not request.user or not request.user.is_authenticated:
            return False
        feature_code = getattr(view, "feature_code", None) or self.feature_code
        if not feature_code:
            return True
        return request.user.has_feature(feature_code)
