"""Middleware for lightweight DDoS protection and request deduplication."""
from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


class DDoSShieldMiddleware:
    """Apply burst limiting and duplicate request detection per client IP."""

    def __init__(self, get_response):
        self.get_response = get_response
        config = getattr(settings, "DDOS_SHIELD", {})
        self.window_seconds = int(config.get("WINDOW_SECONDS", 10))
        self.burst_limit = int(config.get("BURST_LIMIT", 60))
        self.penalty_seconds = int(config.get("PENALTY_SECONDS", 60))
        self.signature_ttl = int(config.get("SIGNATURE_TTL_SECONDS", 15))
        prefixes = config.get("PROTECTED_PATH_PREFIXES", ["/api/"])
        self.protected_prefixes: tuple[str, ...] = tuple(prefixes)

    def __call__(self, request):
        if not self._is_protected_path(request.path):
            return self.get_response(request)

        ident = self._client_ident(request)
        block_key = f"ddos:block:{ident}"
        blocked_until = cache.get(block_key)
        now = time.time()
        if blocked_until and blocked_until > now:
            retry_after = int(blocked_until - now)
            return self._too_many_requests(retry_after)

        if self._is_duplicate_request(request):
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
                expires_at = now + self.window_seconds
        else:
            count = 1
            expires_at = now + self.window_seconds

        cache.set(bucket_key, (count, expires_at), timeout=self.window_seconds)

        if count > self.burst_limit:
            penalty_until = now + self.penalty_seconds
            cache.set(block_key, penalty_until, timeout=self.penalty_seconds)
            return self._too_many_requests(self.penalty_seconds)

        response = self.get_response(request)
        return response

    def _is_protected_path(self, path: str) -> bool:
        return path.startswith(self.protected_prefixes)

    def _client_ident(self, request) -> str:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    def _is_duplicate_request(self, request) -> bool:
        signature = request.headers.get("X-Request-Signature")
        if not signature:
            return False
        signature_key = f"ddos:sig:{signature}"
        added = cache.add(signature_key, True, timeout=self.signature_ttl)
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
