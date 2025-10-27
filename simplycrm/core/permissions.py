"""Custom DRF permissions built on top of feature flags."""
from __future__ import annotations

from rest_framework.permissions import BasePermission


class HasFeaturePermission(BasePermission):
        """Grants access if the authenticated user has a feature flag."""

        feature_code: str | None = None

        def has_permission(self, request, view) -> bool:  # type: ignore[override]
                if not request.user or not request.user.is_authenticated:
                        return False

                feature_code = self._resolve_feature_code(view)
                if not feature_code:
                        return True
                return request.user.has_feature(feature_code)

        def _resolve_feature_code(self, view) -> str | None:
                """Allow viewsets to customize feature gates per action."""

                action = getattr(view, "action", None)
                feature_map = getattr(view, "feature_code_map", None)
                if action and isinstance(feature_map, dict) and action in feature_map:
                        return feature_map[action]
                return getattr(view, "feature_code", None) or self.feature_code
