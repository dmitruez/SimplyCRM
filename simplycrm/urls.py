"""Root URL configuration for SimplyCRM."""
from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from simplycrm.analytics.urls import router as analytics_router
from simplycrm.automation.urls import router as automation_router
from simplycrm.catalog.urls import router as catalog_router
from simplycrm.core.urls import router as core_router
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
):
    for prefix, viewset, basename in sub_router.registry:
        router.register(prefix, viewset, basename=basename)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/", include("rest_framework.urls")),
]
