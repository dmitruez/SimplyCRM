from __future__ import annotations

from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
	default_auto_field = "django.db.models.BigAutoField"
	name = "simplycrm.integrations"
	verbose_name = "SimplyCRM Integrations"
