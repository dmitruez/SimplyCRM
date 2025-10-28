"""ViewSets for integration features."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from simplycrm.core.permissions import HasFeaturePermission
from simplycrm.core import tenant
from simplycrm.integrations import models, serializers


class BaseIntegrationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "integrations.core"
    
    def get_queryset(self):  # type: ignore[override]
        model_cls = self.serializer_class.Meta.model  # type: ignore[attr-defined]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return model_cls.objects.none()
        return model_cls.objects.filter(organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


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
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.IntegrationLog.objects.none()
        return models.IntegrationLog.objects.filter(connection__organization=organization)


class ImportJobViewSet(BaseIntegrationViewSet):
    serializer_class = serializers.ImportJobSerializer
    feature_code = "integrations.imports"
