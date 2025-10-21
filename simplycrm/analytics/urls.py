"""Routers for analytics endpoints."""
from __future__ import annotations

from rest_framework import routers

from simplycrm.analytics import viewsets

router = routers.DefaultRouter()
router.register(r"metric-definitions", viewsets.MetricDefinitionViewSet, basename="metric-definition")
router.register(r"dashboards", viewsets.DashboardViewSet, basename="dashboard")
router.register(r"reports", viewsets.ReportViewSet, basename="report")
router.register(r"insights", viewsets.InsightViewSet, basename="insight")
router.register(r"forecasts", viewsets.ForecastViewSet, basename="forecast")
router.register(r"customer-segments", viewsets.CustomerSegmentViewSet, basename="customer-segment")
router.register(r"model-training-runs", viewsets.ModelTrainingRunViewSet, basename="model-training-run")
router.register(r"data-sources", viewsets.DataSourceViewSet, basename="data-source")
router.register(r"data-sync-logs", viewsets.DataSyncLogViewSet, basename="data-sync-log")
router.register(r"insight-analytics", viewsets.InsightAnalyticsViewSet, basename="insight-analytics")
