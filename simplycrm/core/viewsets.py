"""ViewSets for core resources."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import mixins, permissions, viewsets

from simplycrm.core import models, serializers
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
        if user.is_superuser:
            return qs
        return qs.filter(organization=user.organization)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(organization=self.request.user.organization)


class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.select_related("organization").all()
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        if user.is_superuser:
            return super().get_queryset()
        return super().get_queryset().filter(organization=user.organization)

    def perform_create(self, serializer):  # type: ignore[override]
        if self.request.user.is_superuser and serializer.validated_data.get("organization"):
            serializer.save()
        else:
            serializer.save(organization=self.request.user.organization)

    def perform_update(self, serializer):  # type: ignore[override]
        if self.request.user.is_superuser:
            serializer.save()
        else:
            serializer.save(organization=self.request.user.organization)


class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = models.UserRole.objects.select_related("user", "user__organization").all()
    serializer_class = serializers.UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user
        qs = super().get_queryset()
        if user.is_superuser:
            return qs
        return qs.filter(user__organization=user.organization)


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = models.AuditLog.objects.select_related("organization", "user")
    serializer_class = serializers.AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "compliance.audit_logs"

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(organization=user.organization)
