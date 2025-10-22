"""Security utilities for authentication hardening."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


@dataclass(frozen=True)
class LockoutState:
    """Information about an active lockout for diagnostic responses."""

    remaining_seconds: int


class LoginAttemptTracker:
    """Tracks login failures to protect against brute-force attacks."""

    def __init__(self, identifier: str) -> None:
        digest = hashlib.sha256(identifier.encode("utf-8", "ignore")).hexdigest()
        self._attempts_key = f"auth:attempts:{digest}"
        self._lock_key = f"auth:lock:{digest}"

    @classmethod
    def from_request(cls, username: str | None, client_ip: str) -> "LoginAttemptTracker":
        identifier = f"{username or ''}:{client_ip}"
        return cls(identifier)

    # Configuration helpers -------------------------------------------------
    @property
    def _max_attempts(self) -> int:
        return settings.LOGIN_SECURITY["MAX_ATTEMPTS"]

    @property
    def _attempt_window(self) -> timedelta:
        seconds = settings.LOGIN_SECURITY["ATTEMPT_WINDOW_SECONDS"]
        return timedelta(seconds=seconds)

    @property
    def _lockout_period(self) -> timedelta:
        seconds = settings.LOGIN_SECURITY["LOCKOUT_SECONDS"]
        return timedelta(seconds=seconds)

    # Public API ------------------------------------------------------------
    def is_locked(self) -> LockoutState | None:
        locked_at = cache.get(self._lock_key)
        if not locked_at:
            return None
        elapsed = timezone.now() - locked_at
        remaining = int(self._lockout_period.total_seconds() - elapsed.total_seconds())
        if remaining <= 0:
            cache.delete(self._lock_key)
            cache.delete(self._attempts_key)
            return None
        return LockoutState(remaining_seconds=remaining)

    def register_failure(self) -> LockoutState | None:
        attempts = cache.get(self._attempts_key, 0) + 1
        cache.set(self._attempts_key, attempts, timeout=self._attempt_window)
        if attempts >= self._max_attempts:
            cache.set(self._lock_key, timezone.now(), timeout=self._lockout_period)
            return self.is_locked()
        return None

    def reset(self) -> None:
        cache.delete(self._attempts_key)
        cache.delete(self._lock_key)
