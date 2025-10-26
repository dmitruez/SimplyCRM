"""Routers for integration endpoints."""
from __future__ import annotations

from rest_framework import routers
from simplycrm.integrations import viewsets


router = routers.DefaultRouter()
router.register(r"api-keys", viewsets.ApiKeyViewSet, basename="api-key")
router.register(r"webhook-subscriptions", viewsets.WebhookSubscriptionViewSet, basename="webhook-subscription")
router.register(r"integration-connections", viewsets.IntegrationConnectionViewSet, basename="integration-connection")
router.register(r"integration-logs", viewsets.IntegrationLogViewSet, basename="integration-log")
router.register(r"import-jobs", viewsets.ImportJobViewSet, basename="import-job")
