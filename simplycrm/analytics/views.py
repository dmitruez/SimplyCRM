"""Analytics views exposed via API and templates."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from django.views.generic import TemplateView
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from simplycrm.analytics import services
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission
from simplycrm.sales import models as sales_models


class AnalyticsOverviewView(APIView):
        """Provide a summarized analytics snapshot for the dashboard widget."""

        permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
        feature_code = "analytics.standard"

        def get(self, request, *args, **kwargs):  # type: ignore[override]
                organization = tenant.get_request_organization(request)
                if organization is None:
                        return Response(
                                {"detail": "Активная организация не выбрана."},
                                status=status.HTTP_400_BAD_REQUEST,
                        )
                organization_id = organization.id

                orders_qs = sales_models.Order.objects.filter(
                        organization=organization
                ).prefetch_related("lines", "opportunity__pipeline")

                rfm_scores = services.calculate_rfm_scores(orders_qs)
                price_recommendations = services.recommend_price_actions(organization_id)[
                        "recommendations"
                ]
                next_best_actions = services.suggest_next_best_actions(organization_id)
                anomalies = services.detect_sales_anomalies(organization_id)

                summary = {
                        "rfmSegments": len(rfm_scores),
                        "demandAlerts": len(anomalies),
                        "priceRecommendations": len(price_recommendations),
                        "nextBestActions": len(next_best_actions),
                }

                start_date = timezone.now().date() - timedelta(days=13)
                line_value = ExpressionWrapper(
                        F("lines__unit_price") * F("lines__quantity") - F("lines__discount_amount"),
                        output_field=DecimalField(max_digits=14, decimal_places=2),
                )
                performance_rows = (
                        orders_qs.filter(ordered_at__date__gte=start_date)
                        .annotate(order_day=TruncDate("ordered_at"))
                        .values("order_day")
                        .annotate(
                                revenue=Coalesce(Sum(line_value), Decimal("0")),
                                orders=Count("id", distinct=True),
                        )
                        .order_by("order_day")
                )
                performance = []
                for row in performance_rows:
                        revenue = float(row["revenue"] or 0)
                        orders_count = row["orders"] or 0
                        average = revenue / orders_count if orders_count else 0.0
                        performance.append(
                                {
                                        "date": row["order_day"].isoformat() if row["order_day"] else None,
                                        "revenue": revenue,
                                        "orders": orders_count,
                                        "averageOrderValue": average,
                                }
                        )

                channel_rows = (
                        orders_qs.annotate(
                                pipeline_name=Coalesce(
                                        F("opportunity__pipeline__name"),
                                        F("status"),
                                )
                        )
                        .values("pipeline_name")
                        .annotate(value=Coalesce(Sum(line_value), Decimal("0")))
                        .order_by("pipeline_name")
                )
                channel_breakdown = [
                        {
                                "channel": row["pipeline_name"] or "Direct",
                                "value": float(row["value"] or 0),
                        }
                        for row in channel_rows
                ]

                payload = {
                        "summary": summary,
                        "performance": performance,
                        "channelBreakdown": channel_breakdown,
                }
                return Response(payload)


class AnalyticsDashboardView(LoginRequiredMixin, TemplateView):
        """Render a curated analytics dashboard for human operators."""

        template_name = "analytics/dashboard.html"

        def get_context_data(self, **kwargs):  # type: ignore[override]
                context = super().get_context_data(**kwargs)
                user = self.request.user
                active_org = tenant.get_active_organization(user.organization)
                context.update(
                        {
                                "organization": active_org or user.organization,
                                "username": user.get_full_name() or user.username,
                                "feature_codes": sorted(user.feature_codes()),
                        }
                )
                return context
