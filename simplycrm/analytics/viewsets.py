"""ViewSets exposing analytics data."""
from __future__ import annotations

from rest_framework import decorators, permissions, response, status, viewsets

from simplycrm.analytics import models, serializers, services
from simplycrm.core.permissions import HasFeaturePermission


class BaseAnalyticsViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "analytics.standard"

    def get_queryset(self):  # type: ignore[override]
        model_cls = self.serializer_class.Meta.model  # type: ignore[attr-defined]
        return model_cls.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(organization=self.request.user.organization)


class MetricDefinitionViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.MetricDefinitionSerializer
    feature_code = "analytics.custom_metrics"


class DashboardViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.DashboardSerializer


class ReportViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.ReportSerializer
    feature_code = "analytics.automated_reports"


class InsightViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.InsightSerializer


class ForecastViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.ForecastSerializer
    feature_code = "analytics.forecasting"


class CustomerSegmentViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.CustomerSegmentSerializer
    feature_code = "analytics.customer_segments"


class ModelTrainingRunViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.ModelTrainingRunSerializer
    feature_code = "analytics.mlops"


class DataSourceViewSet(BaseAnalyticsViewSet):
    serializer_class = serializers.DataSourceSerializer
    feature_code = "analytics.integrations"


class DataSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.DataSyncLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "analytics.integrations"

    def get_queryset(self):  # type: ignore[override]
        return models.DataSyncLog.objects.filter(data_source__organization=self.request.user.organization)


class InsightAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "analytics.insights"

    @decorators.action(detail=False, methods=["get"], url_path="rfm")
    def rfm(self, request):
        orders = request.user.organization.orders.all()
        data = services.calculate_rfm_scores(orders)
        return response.Response(data)

    @decorators.action(detail=False, methods=["get"], url_path="sales-metrics")
    def sales_metrics(self, request):
        metrics = services.aggregate_sales_metrics(request.user.organization_id)
        return response.Response(metrics)

    @decorators.action(detail=False, methods=["get"], url_path="anomalies")
    def anomalies(self, request):
        anomalies = services.detect_sales_anomalies(request.user.organization_id)
        return response.Response(anomalies, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"], url_path="price-recommendations")
    def price_recommendations(self, request):
        recommendations = services.recommend_price_actions(request.user.organization_id)
        return response.Response(recommendations)

    @decorators.action(detail=False, methods=["get"], url_path="demand-forecast")
    def demand_forecast(self, request):
        forecast = services.forecast_product_demand(request.user.organization_id)
        return response.Response(forecast)

    @decorators.action(detail=False, methods=["get"], url_path="next-best-actions")
    def next_best_actions(self, request):
        actions = services.suggest_next_best_actions(request.user.organization_id)
        return response.Response(actions)
