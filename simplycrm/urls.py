"""Root URL configuration for SimplyCRM."""
from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework import routers
from simplycrm.analytics.urls import router as analytics_router
from simplycrm.analytics.views import AnalyticsDashboardView
from simplycrm.assistant.urls import router as assistant_router
from simplycrm.automation.urls import router as automation_router
from simplycrm.catalog.urls import router as catalog_router
from simplycrm.core.urls import router as core_router
from simplycrm.core.views import (
	CSRFCookieView,
	DashboardOverviewView,
	GoogleAuthView,
	ObtainAuthTokenView,
	ProfileView,
	RegisterView,
	RevokeAuthTokenView,
)
from simplycrm.integrations.urls import router as integrations_router
from simplycrm.sales.urls import router as sales_router


router = routers.DefaultRouter()
for sub_router in (
		core_router,
		catalog_router,
		sales_router,
		analytics_router,
		automation_router,
		integrations_router,
		assistant_router,
):
	for prefix, viewset, basename in sub_router.registry:
		router.register(prefix, viewset, basename=basename)

urlpatterns = [
	path("jet/", include("jet.urls", "jet")),
	path("jet/dashboard/", include("jet.dashboard.urls", "jet-dashboard")),
	path("admin/", admin.site.urls),
	path("api/", include(router.urls)),
	path("api/auth/", include("rest_framework.urls")),
	path("api/auth/csrf/", CSRFCookieView.as_view(), name="auth-csrf"),
	path("api/auth/token/", ObtainAuthTokenView.as_view(), name="auth-token"),
	path("api/auth/token/revoke/", RevokeAuthTokenView.as_view(), name="auth-token-revoke"),
	path("api/auth/profile/", ProfileView.as_view(), name="auth-profile"),
	path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
	path("api/auth/google/", GoogleAuthView.as_view(), name="auth-google"),
	path("api/dashboard/overview/", DashboardOverviewView.as_view(), name="dashboard-overview"),
	path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
	path(
		"api/docs/",
		SpectacularSwaggerView.as_view(url_name="schema"),
		name="swagger-ui",
	),
	path(
		"api/redoc/",
		SpectacularRedocView.as_view(url_name="schema"),
		name="redoc",
	),
	path("dashboard/", AnalyticsDashboardView.as_view(), name="analytics-dashboard"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
