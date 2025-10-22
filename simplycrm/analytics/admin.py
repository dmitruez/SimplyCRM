from __future__ import annotations

from django.contrib import admin

from simplycrm.analytics import models


@admin.register(models.MetricDefinition)
class MetricDefinitionAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "organization", "is_active")
    search_fields = ("code", "name")
    list_filter = ("organization", "is_active")


@admin.register(models.Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ("name", "organization")


@admin.register(models.Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "schedule_cron", "last_run_status")


@admin.register(models.Insight)
class InsightAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "severity", "detected_at")


@admin.register(models.Forecast)
class ForecastAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "target", "horizon_days", "generated_at")


@admin.register(models.CustomerSegment)
class CustomerSegmentAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "size", "ltv", "churn_rate", "updated_at")


@admin.register(models.ModelTrainingRun)
class ModelTrainingRunAdmin(admin.ModelAdmin):
    list_display = ("model_type", "organization", "status", "started_at", "completed_at")


@admin.register(models.DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "source_type", "is_active")


@admin.register(models.DataSyncLog)
class DataSyncLogAdmin(admin.ModelAdmin):
    list_display = ("data_source", "status", "started_at", "completed_at")
