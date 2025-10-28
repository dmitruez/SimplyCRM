"""ViewSets for core resources."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import ValidationError
from simplycrm.core import models, serializers, tenant
from simplycrm.core.permissions import HasFeaturePermission


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = models.Organization.objects.all()
    serializer_class = serializers.OrganizationSerializer
    permission_classes = [permissions.IsAdminUser]


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = models.SubscriptionPlan.objects.all()
    serializer_class = serializers.SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class FeatureFlagViewSet(viewsets.ModelViewSet):
    queryset = models.FeatureFlag.objects.prefetch_related("plans").all()
    serializer_class = serializers.FeatureFlagSerializer
    permission_classes = [permissions.IsAdminUser]


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = models.Subscription.objects.select_related("organization", "plan").all()
    serializer_class = serializers.SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "billing.manage_subscriptions"
    
    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        impersonated = getattr(self.request, "impersonated_organization", None)
        if user.is_superuser and not impersonated:
            return qs
        organization = tenant.get_request_organization(self.request)
        if organization:
            return qs.filter(organization=organization)
        return qs.none()

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if organization is None:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.select_related("organization").all()
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        impersonated = getattr(self.request, "impersonated_organization", None)
        if user.is_superuser and not impersonated:
            return qs
        organization = tenant.get_request_organization(self.request)
        if organization:
            return qs.filter(organization=organization)
        return qs.none()

    def perform_create(self, serializer):  # type: ignore[override]
        if self.request.user.is_superuser and serializer.validated_data.get("organization"):
            serializer.save()
            return

        organization = tenant.get_request_organization(self.request)
        if organization is None:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)

    def perform_update(self, serializer):  # type: ignore[override]
        if self.request.user.is_superuser and serializer.validated_data.get("organization"):
            serializer.save()
            return

        organization = tenant.get_request_organization(self.request)
        if organization is None:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = models.UserRole.objects.select_related("user", "user__organization").all()
    serializer_class = serializers.UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        impersonated = getattr(self.request, "impersonated_organization", None)
        if user.is_superuser and not impersonated:
            return qs
        organization = tenant.get_request_organization(self.request)
        if organization:
            return qs.filter(user__organization=organization)
        return qs.none()


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = models.AuditLog.objects.select_related("organization", "user")
    serializer_class = serializers.AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "compliance.audit_logs"

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        impersonated = getattr(self.request, "impersonated_organization", None)
        if user.is_superuser and not impersonated:
            return qs
        organization = tenant.get_request_organization(self.request)
        if organization:
            return qs.filter(organization=organization)
        return qs.none()


class OrganizationInviteViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.OrganizationInviteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.OrganizationInvite.objects.none()
        return (
            models.OrganizationInvite.objects.select_related("organization", "created_by", "accepted_by")
            .filter(organization=organization)
        )

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if organization is None:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization, created_by=self.request.user)
