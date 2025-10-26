"""Serializers for analytics models."""
from __future__ import annotations

from rest_framework import serializers
from simplycrm.analytics import models


class MetricDefinitionSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.MetricDefinition
		fields = ["id", "organization", "code", "name", "description", "query", "is_active"]
		read_only_fields = ["id"]


class DashboardSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.Dashboard
		fields = ["id", "organization", "name", "layout", "filters"]
		read_only_fields = ["id"]


class ReportSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.Report
		fields = ["id", "organization", "name", "definition", "schedule_cron", "last_run_at", "last_run_status"]
		read_only_fields = ["id", "last_run_at", "last_run_status"]


class InsightSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.Insight
		fields = ["id", "organization", "title", "description", "severity", "data", "detected_at"]
		read_only_fields = ["id", "detected_at"]


class ForecastSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.Forecast
		fields = [
			"id",
			"organization",
			"name",
			"target",
			"horizon_days",
			"configuration",
			"result",
			"generated_at",
		]
		read_only_fields = ["id", "generated_at"]


class CustomerSegmentSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.CustomerSegment
		fields = [
			"id",
			"organization",
			"name",
			"description",
			"filter_definition",
			"size",
			"ltv",
			"churn_rate",
			"updated_at",
		]
		read_only_fields = ["id", "updated_at"]


class ModelTrainingRunSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.ModelTrainingRun
		fields = [
			"id",
			"organization",
			"model_type",
			"status",
			"parameters",
			"metrics",
			"started_at",
			"completed_at",
		]
		read_only_fields = ["id", "started_at", "completed_at"]


class DataSourceSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.DataSource
		fields = ["id", "organization", "name", "source_type", "config", "is_active"]
		read_only_fields = ["id"]


class DataSyncLogSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.DataSyncLog
		fields = ["id", "data_source", "status", "started_at", "completed_at", "stats"]
		read_only_fields = ["id", "started_at"]


class RfmScoreSerializer(serializers.Serializer):
	customer_id = serializers.IntegerField()
	recency = serializers.IntegerField(allow_null=True)
	frequency = serializers.IntegerField()
	monetary = serializers.FloatField()


class SalesMetricsSerializer(serializers.Serializer):
	total_revenue = serializers.DecimalField(max_digits=18, decimal_places=2)
	average_order_value = serializers.DecimalField(max_digits=18, decimal_places=2)
	orders_count = serializers.IntegerField()


class AnalyticsAnomalySerializer(serializers.Serializer):
	type = serializers.CharField()
	message = serializers.CharField()


class PriceRecommendationSerializer(serializers.Serializer):
	variant_id = serializers.IntegerField()
	variant_name = serializers.CharField()
	units_sold = serializers.IntegerField()
	stock_on_hand = serializers.IntegerField()
	coverage_weeks = serializers.FloatField(allow_null=True)
	margin = serializers.FloatField()
	action = serializers.CharField()
	reason = serializers.CharField()
	trend_label = serializers.CharField()


class PriceRecommendationResultSerializer(serializers.Serializer):
	generated_at = serializers.DateTimeField()
	recommendations = PriceRecommendationSerializer(many=True)


class ProductDemandEntrySerializer(serializers.Serializer):
	variant_id = serializers.IntegerField()
	variant_name = serializers.CharField()
	velocity = serializers.FloatField()


class ProductDemandForecastSerializer(serializers.Serializer):
	high_demand = ProductDemandEntrySerializer(many=True)
	low_velocity = ProductDemandEntrySerializer(many=True)


class NextBestActionSerializer(serializers.Serializer):
	opportunity_id = serializers.IntegerField()
	summary = serializers.CharField()
	reason = serializers.CharField()
