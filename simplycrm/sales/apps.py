from __future__ import annotations

from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "simplycrm.sales"
    verbose_name = "SimplyCRM Sales"
