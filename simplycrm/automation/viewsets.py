"""ViewSets for automation and campaign features."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from simplycrm.automation import models, serializers
from simplycrm.core.permissions import HasFeaturePermission


class BaseAutomationViewSet(viewsets.ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "automation.core"
	
	def get_queryset(self):  # type: ignore[override]
		model_cls = self.serializer_class.Meta.model  # type: ignore[attr-defined]
		return model_cls.objects.filter(organization=self.request.user.organization)
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization, created_by=self.request.user)


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
		return models.CampaignStep.objects.filter(campaign__organization=self.request.user.organization)


class NotificationViewSet(BaseAutomationViewSet):
	serializer_class = serializers.NotificationSerializer
	feature_code = "automation.notifications"
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)


class WebhookEventViewSet(BaseAutomationViewSet):
	serializer_class = serializers.WebhookEventSerializer
	feature_code = "automation.webhooks"
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)
