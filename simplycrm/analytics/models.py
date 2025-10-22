"""Analytics domain models for SimplyCRM."""
from __future__ import annotations

from django.db import models


class MetricDefinition(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="metric_definitions")
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    query = models.TextField(help_text="SQL or DSL definition of the metric")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("organization", "code")
        ordering = ["code"]


class Dashboard(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="dashboards")
    name = models.CharField(max_length=255)
    layout = models.JSONField(default=dict, blank=True)
    filters = models.JSONField(default=dict, blank=True)


class Report(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="reports")
    name = models.CharField(max_length=255)
    definition = models.JSONField(default=dict, blank=True)
    schedule_cron = models.CharField(max_length=64, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_run_status = models.CharField(max_length=32, default="never")


class Insight(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="insights")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=32, default="info")
    data = models.JSONField(default=dict, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)


class Forecast(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="forecasts")
    name = models.CharField(max_length=255)
    target = models.CharField(max_length=128)
    horizon_days = models.PositiveIntegerField(default=30)
    configuration = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)


class CustomerSegment(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="segments")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    filter_definition = models.JSONField(default=dict, blank=True)
    size = models.PositiveIntegerField(default=0)
    ltv = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    churn_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)


class ModelTrainingRun(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="model_runs")
    model_type = models.CharField(max_length=64)
    status = models.CharField(max_length=32, default="pending")
    parameters = models.JSONField(default=dict, blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class DataSource(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="data_sources")
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=64)
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)


class DataSyncLog(models.Model):
    data_source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="sync_logs")
    status = models.CharField(max_length=32)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    stats = models.JSONField(default=dict, blank=True)
