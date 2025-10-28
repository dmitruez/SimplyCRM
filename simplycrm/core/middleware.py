"""Middleware for security protections and organization scoping."""
from __future__ import annotations

import time
from typing import Callable, Tuple

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

from simplycrm.core import models, tenant


class DDoSShieldMiddleware:
        """Apply burst limiting and duplicate request detection per client IP."""

        def __init__(self, get_response: Callable):
                self.get_response = get_response

        def __call__(self, request):
                config = self._load_config()
                if not config["enabled"]:
                        return self.get_response(request)

                if not self._is_protected_path(request.path, config["protected_prefixes"]):
                        return self.get_response(request)

                ident = self._client_ident(request)
                block_key = f"ddos:block:{ident}"
                blocked_until = cache.get(block_key)
                now = time.time()
                if blocked_until and blocked_until > now:
                        retry_after = int(blocked_until - now)
                        return self._too_many_requests(retry_after)

                if self._is_duplicate_request(request, config["signature_ttl"]):
                        return JsonResponse(
                                {"detail": "Duplicate request detected. Please wait before retrying."},
                                status=409,
                        )

                bucket_key = f"ddos:bucket:{ident}"
                bucket = cache.get(bucket_key)
                if bucket:
                        count, expires_at = bucket
                        if expires_at > now:
                                count += 1
                        else:
                                count = 1
                                expires_at = now + config["window_seconds"]
                else:
                        count = 1
                        expires_at = now + config["window_seconds"]

                cache.set(bucket_key, (count, expires_at), timeout=config["window_seconds"])

                if count > config["burst_limit"]:
                        penalty_until = now + config["penalty_seconds"]
                        cache.set(block_key, penalty_until, timeout=config["penalty_seconds"])
                        return self._too_many_requests(config["penalty_seconds"])

                response = self.get_response(request)
                return response

        @staticmethod
        def _load_config() -> dict:
                raw = getattr(settings, "DDOS_SHIELD", {})
                return {
                        "enabled": bool(raw.get("ENABLED", True)),
                        "window_seconds": int(raw.get("WINDOW_SECONDS", 10)),
                        "burst_limit": int(raw.get("BURST_LIMIT", 60)),
                        "penalty_seconds": int(raw.get("PENALTY_SECONDS", 60)),
                        "signature_ttl": int(raw.get("SIGNATURE_TTL_SECONDS", 15)),
                        "protected_prefixes": tuple(raw.get("PROTECTED_PATH_PREFIXES", ["/api/"])),
                }

        @staticmethod
        def _is_protected_path(path: str, prefixes: tuple[str, ...]) -> bool:
                return path.startswith(prefixes)

        def _client_ident(self, request) -> str:
                forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
                if forwarded:
                        return forwarded.split(",")[0].strip()
                return request.META.get("REMOTE_ADDR", "unknown")

        def _is_duplicate_request(self, request, signature_ttl: int) -> bool:
                if request.method in {"GET", "HEAD", "OPTIONS", "TRACE"}:
                        return False
                signature = request.headers.get("X-Request-Signature")
                if not signature:
                        return False
                signature_key = f"ddos:sig:{signature}"
                added = cache.add(signature_key, True, timeout=signature_ttl)
                return not added

        @staticmethod
        def _too_many_requests(retry_after: int):
                retry_after = max(1, int(retry_after))
                response = JsonResponse(
                        {
                                "detail": "Too many requests detected. Slow down and try again later.",
                                "retry_after": retry_after,
                        },
                        status=429,
                )
                response["Retry-After"] = str(retry_after)
                return response


class TokenAuthenticationMiddleware:
        """Authenticate DRF token users before organization scoping runs."""

        def __init__(self, get_response: Callable):
                self.get_response = get_response
                self.authenticator = TokenAuthentication()

        def __call__(self, request):
                user = getattr(request, "user", None)
                if user is not None and getattr(user, "is_authenticated", False):
                        return self.get_response(request)

                auth_header = request.META.get("HTTP_AUTHORIZATION", "") or ""
                if not auth_header.lower().startswith("token "):
                        return self.get_response(request)

                try:
                        auth_result = self.authenticator.authenticate(request)
                except AuthenticationFailed:
                        auth_result = None

                if auth_result is not None:
                        user, token = auth_result
                        request.user = user
                        request.auth = token

                return self.get_response(request)


class OrganizationContextMiddleware:
        """Bind the active organization (including impersonation) to the request."""

        session_key = "active_organization_id"

        def __init__(self, get_response: Callable):
                self.get_response = get_response

        def __call__(self, request):
                organization, impersonating = self._resolve_organization(request)
                token = tenant.activate(organization)
                request.active_organization = organization
                request.impersonated_organization = organization if impersonating else None
                try:
                        response = self.get_response(request)
                finally:
                        tenant.deactivate(token)
                return response

        def _resolve_organization(self, request) -> Tuple[models.Organization | None, bool]:
                user = getattr(request, "user", None)
                if not user or not getattr(user, "is_authenticated", False):
                        return None, False

                base = getattr(user, "organization", None)
                candidate = self._resolve_candidate(request)

                if not candidate or candidate == base:
                        self._clear_session_override(request)
                        return base, False

                if not self._can_impersonate(user):
                        self._clear_session_override(request)
                        return base, False

                self._persist_session_override(request, candidate)
                return candidate, True

        def _resolve_candidate(self, request) -> models.Organization | None:
                candidate_id = self._resolve_candidate_id(request)
                candidate_slug = self._resolve_candidate_slug(request)

                if candidate_id is not None:
                        try:
                                organization = models.Organization.objects.get(pk=candidate_id)
                                self._persist_session_override(request, organization)
                                return organization
                        except models.Organization.DoesNotExist:
                                self._clear_session_override(request)
                                return None

                if candidate_slug:
                        try:
                                organization = models.Organization.objects.get(slug=candidate_slug)
                        except models.Organization.DoesNotExist:
                                self._clear_session_override(request)
                                return None
                        self._persist_session_override(request, organization)
                        return organization

                return None

        def _resolve_candidate_id(self, request) -> int | None:
                header_value = request.headers.get("X-Organization-Id")
                query_value = request.GET.get("organization_id") if hasattr(request, "GET") else None
                session = getattr(request, "session", None)
                session_value = session.get(self.session_key) if session else None

                for raw in (header_value, query_value, session_value):
                        if raw in (None, ""):
                                continue
                        try:
                                return int(raw)
                        except (TypeError, ValueError):
                                continue
                return None

        def _resolve_candidate_slug(self, request) -> str | None:
                header_value = request.headers.get("X-Organization-Slug")
                query_value = request.GET.get("organization_slug") if hasattr(request, "GET") else None
                return header_value or query_value

        def _persist_session_override(self, request, organization: models.Organization) -> None:
                session = getattr(request, "session", None)
                if session is not None:
                        session[self.session_key] = organization.id

        def _clear_session_override(self, request) -> None:
                session = getattr(request, "session", None)
                if session is not None and self.session_key in session:
                        session.pop(self.session_key, None)

        @staticmethod
        def _can_impersonate(user) -> bool:
                return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
