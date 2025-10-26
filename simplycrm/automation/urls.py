"""Routers for automation endpoints."""
from __future__ import annotations

from rest_framework import routers
from simplycrm.automation import viewsets


router = routers.DefaultRouter()
router.register(r"automation-rules", viewsets.AutomationRuleViewSet, basename="automation-rule")
router.register(r"campaigns", viewsets.CampaignViewSet, basename="campaign")
router.register(r"campaign-steps", viewsets.CampaignStepViewSet, basename="campaign-step")
router.register(r"notifications", viewsets.NotificationViewSet, basename="notification")
router.register(r"webhook-events", viewsets.WebhookEventViewSet, basename="webhook-event")
