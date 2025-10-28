"""ViewSets exposing analytics data."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import ValidationError
from simplycrm.analytics import models, serializers, services
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission
from simplycrm.core.serializers import EmptySerializer


class BaseAnalyticsViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "analytics.standard"
    
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
        serializer.save(organization=organization)


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
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.DataSyncLog.objects.none()
        return models.DataSyncLog.objects.filter(data_source__organization=organization)


class InsightAnalyticsViewSet(viewsets.ViewSet):
    """High-level analytics endpoints that surface derived insights."""

    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "analytics.insights"
    feature_code_map = {
        "rfm": "analytics.customer_segments",
        "sales_metrics": "analytics.standard",
        "anomalies": "analytics.insights",
        "price_recommendations": "analytics.insights",
        "demand_forecast": "analytics.forecasting",
        "next_best_actions": "analytics.forecasting",
    }
    serializer_class = EmptySerializer
    
    @extend_schema(responses=serializers.RfmScoreSerializer(many=True))
    @decorators.action(detail=False, methods=["get"], url_path="rfm")
    def rfm(self, request):
        organization = tenant.get_request_organization(request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        orders = organization.orders.all()
        data = services.calculate_rfm_scores(orders)
        return response.Response(data)
    
    @extend_schema(responses=serializers.SalesMetricsSerializer)
    @decorators.action(detail=False, methods=["get"], url_path="sales-metrics")
    def sales_metrics(self, request):
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")
        metrics = services.aggregate_sales_metrics(organization_id)
        return response.Response(metrics)
    
    @extend_schema(responses=serializers.AnalyticsAnomalySerializer(many=True))
    @decorators.action(detail=False, methods=["get"], url_path="anomalies")
    def anomalies(self, request):
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")
        anomalies = services.detect_sales_anomalies(organization_id)
        return response.Response(anomalies, status=status.HTTP_200_OK)
    
    @extend_schema(responses=serializers.PriceRecommendationResultSerializer)
    @decorators.action(detail=False, methods=["get"], url_path="price-recommendations")
    def price_recommendations(self, request):
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")
        recommendations = services.recommend_price_actions(organization_id)
        return response.Response(recommendations)
    
    @extend_schema(responses=serializers.ProductDemandForecastSerializer)
    @decorators.action(detail=False, methods=["get"], url_path="demand-forecast")
    def demand_forecast(self, request):
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")
        forecast = services.forecast_product_demand(organization_id)
        return response.Response(forecast)
    
    @extend_schema(responses=serializers.NextBestActionSerializer(many=True))
    @decorators.action(detail=False, methods=["get"], url_path="next-best-actions")
    def next_best_actions(self, request):
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")
        actions = services.suggest_next_best_actions(organization_id)
        return response.Response(actions)
