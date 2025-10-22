"""Authentication endpoints with hardened security defaults."""
from __future__ import annotations

from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from simplycrm.core.security import LoginAttemptTracker
from simplycrm.core.serializers import AuthTokenSerializer, EmptySerializer
from simplycrm.core.throttling import LoginRateThrottle


class ObtainAuthTokenView(generics.GenericAPIView):
    """Issue DRF tokens with brute-force protection."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        tracker = LoginAttemptTracker.from_request(username, self._client_ip(request))
        lock = tracker.is_locked()
        if lock:
            return Response(
                {"detail": _(f"Too many attempts. Try again in {lock.remaining_seconds} seconds.")},
                status=status.HTTP_423_LOCKED,
            )

        user = authenticate(request=request, username=username, password=password)
        if not user:
            lock = tracker.register_failure()
            message = _("Invalid username or password.")
            if lock:
                message = _("Account locked due to too many failed attempts. Try again later.")
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            tracker.register_failure()
            return Response({"detail": _("User account is disabled.")}, status=status.HTTP_403_FORBIDDEN)

        tracker.reset()
        token, created = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "created": created})

    @staticmethod
    def _client_ip(request) -> str:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")


class RevokeAuthTokenView(generics.GenericAPIView):
    """Allow authenticated users to revoke their active token."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmptySerializer

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
