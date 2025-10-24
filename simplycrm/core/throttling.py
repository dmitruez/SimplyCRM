"""Custom throttles for security sensitive endpoints."""
from __future__ import annotations

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
	"""Apply aggressive throttling to authentication endpoints."""
	
	scope = "login"
	
	def get_cache_key(self, request, view):  # type: ignore[override]
		ident = self.get_ident(request)
		username = request.data.get("username") if request.method == "POST" else None
		cache_ident = f"{username}:{ident}" if username else ident
		return self.cache_format % {"scope": self.scope, "ident": cache_ident}


class RegistrationRateThrottle(SimpleRateThrottle):
	"""Protect the self-service registration endpoint from abuse."""
	
	scope = "registration"
	
	def get_cache_key(self, request, view):  # type: ignore[override]
		ident = self.get_ident(request)
		return self.cache_format % {"scope": self.scope, "ident": ident}
