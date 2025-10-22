from __future__ import annotations

from django.apps import AppConfig


class AutomationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "simplycrm.automation"
    verbose_name = "SimplyCRM Automation"
