"""Custom throttles for security sensitive endpoints."""
from __future__ import annotations

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Apply aggressive throttling to authentication endpoints."""

    scope = "login"

    def get_cache_key(self, request, view):  # type: ignore[override]
        ident = self.get_ident(request)
        username = request.data.get("username") if request.method == "POST" else None
        if username:
            ident = f"{username}:{ident}"
        return self.cache_format % {"scope": self.scope, "ident": ident}
