"""Router for core viewsets."""
from __future__ import annotations

from rest_framework import routers

from simplycrm.core import viewsets

router = routers.DefaultRouter()
router.register(r"organizations", viewsets.OrganizationViewSet)
router.register(r"subscription-plans", viewsets.SubscriptionPlanViewSet)
router.register(r"feature-flags", viewsets.FeatureFlagViewSet)
router.register(r"subscriptions", viewsets.SubscriptionViewSet)
router.register(r"users", viewsets.UserViewSet)
router.register(r"user-roles", viewsets.UserRoleViewSet)
router.register(r"audit-logs", viewsets.AuditLogViewSet, basename="audit-log")
