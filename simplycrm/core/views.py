"""Authentication endpoints with hardened security defaults."""
from __future__ import annotations

import importlib

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from simplycrm.core.security import LoginAttemptTracker
from simplycrm.core.serializers import (
    AuthTokenSerializer,
    GoogleAuthSerializer,
    RegistrationSerializer,
    UserProfileSerializer,
)
from simplycrm.core.services import provision_google_account
from simplycrm.core.throttling import LoginRateThrottle, RegistrationRateThrottle


class ObtainAuthTokenView(APIView):
    """Issue DRF tokens with brute-force protection."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = AuthTokenSerializer(data=request.data)
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
        payload = self._build_auth_payload(user)
        return Response(payload, status=status.HTTP_200_OK)

    @staticmethod
    def _client_ip(request) -> str:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    @staticmethod
    def _build_auth_payload(user):
        token, _ = Token.objects.get_or_create(user=user)
        profile = UserProfileSerializer(user).data
        return {"access": token.key, "token_type": "Token", "profile": profile}


class RevokeAuthTokenView(APIView):
    """Allow authenticated users to revoke their active token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    """Return the authenticated user's profile details."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class RegisterView(APIView):
    """Self-service registration endpoint with throttling."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        payload = ObtainAuthTokenView._build_auth_payload(user)
        return Response(payload, status=status.HTTP_201_CREATED)


class GoogleAuthView(APIView):
    """Authenticate or register a user using a verified Google ID token."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):  # type: ignore[override]
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_settings = getattr(settings, "GOOGLE_OAUTH", {})
        client_id = google_settings.get("CLIENT_ID")
        if not client_id:
            raise ValidationError({"detail": _("Google Sign-In is not configured.")})

        if importlib.util.find_spec("google.oauth2") is None:
            raise ValidationError({
                "detail": _("Google authentication library is not installed on the server."),
            })

        from google.auth.transport import requests as google_requests  # type: ignore
        from google.oauth2 import id_token  # type: ignore

        credential = serializer.validated_data["credential"]
        try:
            id_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:  # pragma: no cover - external dependency
            raise ValidationError({"detail": _("Invalid Google credential provided.")}) from exc

        email = id_info.get("email")
        if not email:
            raise ValidationError({"detail": _("Google account email is required.")})

        allowed_domains = google_settings.get("ALLOWED_DOMAINS")
        if allowed_domains:
            domain = email.split("@")[-1].lower()
            if domain not in {d.lower() for d in allowed_domains}:
                raise ValidationError({"detail": _("Email domain is not allowed for Google Sign-In.")})

        User = get_user_model()
        user = User.objects.filter(email=email).first()
        created = False
        if user is None:
            organization_name = serializer.validated_data.get("organization_name") or id_info.get(
                "hd"
            )
            if not organization_name:
                organization_name = f"{id_info.get('name') or email.split('@')[0]}'s Workspace"

            plan_key = serializer.validated_data.get("plan_key") or None
            result = provision_google_account(
                email=email,
                organization_name=organization_name,
                first_name=id_info.get("given_name", ""),
                last_name=id_info.get("family_name", ""),
                plan_key=plan_key,
            )
            user = result.user
            created = True
        else:
            if not user.is_active:
                raise ValidationError({"detail": _("User account is disabled.")})
            updated_fields: list[str] = []
            given_name = id_info.get("given_name")
            family_name = id_info.get("family_name")
            if given_name and not user.first_name:
                user.first_name = given_name
                updated_fields.append("first_name")
            if family_name and not user.last_name:
                user.last_name = family_name
                updated_fields.append("last_name")
            if updated_fields:
                user.save(update_fields=updated_fields)

        payload = ObtainAuthTokenView._build_auth_payload(user)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(payload, status=status_code)
