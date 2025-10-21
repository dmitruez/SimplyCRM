"""ViewSets for integration features."""
from __future__ import annotations

from rest_framework import permissions, viewsets

from simplycrm.core.permissions import HasFeaturePermission
from simplycrm.integrations import models, serializers


class BaseIntegrationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "integrations.core"

    def get_queryset(self):  # type: ignore[override]
        model_cls = self.serializer_class.Meta.model  # type: ignore[attr-defined]
        return model_cls.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(organization=self.request.user.organization)


class ApiKeyViewSet(BaseIntegrationViewSet):
    serializer_class = serializers.ApiKeySerializer
    feature_code = "integrations.api_keys"


class WebhookSubscriptionViewSet(BaseIntegrationViewSet):
    serializer_class = serializers.WebhookSubscriptionSerializer
    feature_code = "integrations.webhooks"


class IntegrationConnectionViewSet(BaseIntegrationViewSet):
    serializer_class = serializers.IntegrationConnectionSerializer
    feature_code = "integrations.connectors"


class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.IntegrationLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "integrations.connectors"

    def get_queryset(self):  # type: ignore[override]
        return models.IntegrationLog.objects.filter(connection__organization=self.request.user.organization)


class ImportJobViewSet(BaseIntegrationViewSet):
    serializer_class = serializers.ImportJobSerializer
    feature_code = "integrations.imports"
