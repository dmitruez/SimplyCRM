"""Template-based analytics views."""
from __future__ import annotations

from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


class AnalyticsDashboardView(LoginRequiredMixin, TemplateView):
    """Render a curated analytics dashboard for human operators."""

    template_name = "analytics/dashboard.html"

    def get_context_data(self, **kwargs):  # type: ignore[override]
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context.update(
            {
                "organization": user.organization,
                "username": user.get_full_name() or user.username,
                "feature_codes": sorted(user.feature_codes()),
            }
        )
        return context
