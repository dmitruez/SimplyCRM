"""ViewSets for automation and campaign features."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from simplycrm.automation import models, serializers
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission


class BaseAutomationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "automation.core"
    
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
        serializer.save(organization=organization, created_by=self.request.user)


class AutomationRuleViewSet(BaseAutomationViewSet):
    serializer_class = serializers.AutomationRuleSerializer
    feature_code = "automation.rules"


class CampaignViewSet(BaseAutomationViewSet):
    serializer_class = serializers.CampaignSerializer
    feature_code = "automation.campaigns"


class CampaignStepViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.CampaignStepSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "automation.campaigns"
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.CampaignStep.objects.none()
        return models.CampaignStep.objects.filter(campaign__organization=organization)


class NotificationViewSet(BaseAutomationViewSet):
    serializer_class = serializers.NotificationSerializer
    feature_code = "automation.notifications"
    
    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)


class WebhookEventViewSet(BaseAutomationViewSet):
    serializer_class = serializers.WebhookEventSerializer
    feature_code = "automation.webhooks"
    
    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization)
