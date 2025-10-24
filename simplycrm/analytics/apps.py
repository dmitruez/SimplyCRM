from __future__ import annotations

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
	default_auto_field = "django.db.models.BigAutoField"
	name = "simplycrm.analytics"
	verbose_name = "SimplyCRM Analytics"
