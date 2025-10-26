"""Router and endpoints for core services."""
from __future__ import annotations

from django.urls import path
from rest_framework import routers
from simplycrm.core import viewsets
from simplycrm.core.views import (
    GoogleAuthView,
    CSRFCookieView,
    ObtainAuthTokenView,
    ProfileView,
    RegisterView,
    RevokeAuthTokenView,
    BillingOverviewView,
    ChangeSubscriptionPlanView,
    ExcelDataImportView,
)


router = routers.DefaultRouter()
router.register(r"organizations", viewsets.OrganizationViewSet)
router.register(r"subscription-plans", viewsets.SubscriptionPlanViewSet)
router.register(r"feature-flags", viewsets.FeatureFlagViewSet)
router.register(r"subscriptions", viewsets.SubscriptionViewSet)
router.register(r"users", viewsets.UserViewSet)
router.register(r"user-roles", viewsets.UserRoleViewSet)
router.register(r"audit-logs", viewsets.AuditLogViewSet, basename="audit-log")

urlpatterns = [
    *router.urls,
    path("auth/csrf/", CSRFCookieView.as_view(), name="auth-csrf"),
    path("auth/token/", ObtainAuthTokenView.as_view(), name="auth-token"),
    path("auth/token/revoke/", RevokeAuthTokenView.as_view(), name="auth-token-revoke"),
    path("auth/profile/", ProfileView.as_view(), name="auth-profile"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("billing/overview/", BillingOverviewView.as_view(), name="billing-overview"),
    path("billing/change-plan/", ChangeSubscriptionPlanView.as_view(), name="billing-change-plan"),
    path("data-import/", ExcelDataImportView.as_view(), name="data-import"),
]
