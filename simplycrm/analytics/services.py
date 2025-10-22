"""High-level analytics services and predictive helpers."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

from django.db.models import Avg, F, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from simplycrm.catalog.models import InventoryLot, ProductVariant
from simplycrm.sales.models import DealActivity, Opportunity, Order, OrderLine


def calculate_rfm_scores(orders: Iterable[Order]) -> list[dict[str, object]]:
    """Compute Recency-Frequency-Monetary scores for customers."""
    results: list[dict[str, object]] = []
    for order in orders:
        customer_id = order.contact_id or order.organization_id
        results.append(
            {
                "customer_id": customer_id,
                "recency": (date.today() - order.ordered_at.date()).days if order.ordered_at else None,
                "frequency": order.contact.orders.count() if order.contact else 1,
                "monetary": float(order.total_amount()),
            }
        )
    return results


def aggregate_sales_metrics(organization_id: int) -> dict[str, Decimal | int]:
    """Aggregate key sales metrics for dashboards."""
    lines = OrderLine.objects.filter(order__organization_id=organization_id)
    total_revenue = lines.aggregate(total=Sum(F("unit_price") * F("quantity")))
    average_order_value = lines.aggregate(avg=Avg(F("unit_price") * F("quantity")))
    orders_count = Order.objects.filter(organization_id=organization_id).count()
    return {
        "total_revenue": total_revenue["total"] or Decimal("0.00"),
        "average_order_value": average_order_value["avg"] or Decimal("0.00"),
        "orders_count": orders_count,
    }


def detect_sales_anomalies(organization_id: int) -> list[dict[str, object]]:
    """Placeholder anomaly detection using simple heuristics."""
    metrics = aggregate_sales_metrics(organization_id)
    anomalies: list[dict[str, object]] = []
    if metrics["orders_count"] > 0 and metrics["average_order_value"] == Decimal("0.00"):
        anomalies.append({"type": "low_aov", "message": "Average order value is zero despite orders."})
    return anomalies


def _order_lines_for_org(organization_id: int):
    return OrderLine.objects.filter(order__organization_id=organization_id)


def recommend_price_actions(organization_id: int) -> dict[str, object]:
    """Suggest price adjustments based on velocity and margin signals."""

    window_start = timezone.now() - timedelta(days=30)
    lines_qs = (
        _order_lines_for_org(organization_id)
        .filter(order__ordered_at__gte=window_start)
        .values("product_variant")
        .annotate(
            units_sold=Coalesce(Sum("quantity"), 0),
            revenue=Coalesce(Sum(F("unit_price") * F("quantity")), Decimal("0.00")),
            avg_discount=Coalesce(Avg("discount_amount"), Decimal("0.00")),
        )
    )
    lines = list(lines_qs)
    inventory = (
        InventoryLot.objects.filter(variant__product__organization_id=organization_id)
        .values("variant")
        .annotate(total_stock=Coalesce(Sum("quantity"), 0))
    )
    inventory_map = {item["variant"]: item["total_stock"] for item in inventory}
    variant_ids = [row["product_variant"] for row in lines]
    variants = ProductVariant.objects.select_related("product").in_bulk(variant_ids)

    recommendations: list[dict[str, object]] = []
    for row in lines:
        variant_id = row["product_variant"]
        variant = variants.get(variant_id)
        if not variant:
            continue
        stock = inventory_map.get(variant_id, 0)
        units_sold = row["units_sold"] or 0
        revenue = row["revenue"] or Decimal("0.00")
        avg_price = (revenue / units_sold) if units_sold else variant.price
        margin = float(avg_price - variant.cost)
        coverage_weeks = (stock / units_sold * 4) if units_sold else float("inf")

        if units_sold == 0 and stock > 0:
            action = "consider_discount"
            reason = "Inventory is not moving over the last month."
        elif coverage_weeks < 2:
            action = "raise_price"
            reason = "Demand is outpacing supply; margin headroom available."
        elif margin < 1:
            action = "review_costs"
            reason = "Margin is extremely low; verify vendor pricing or adjust list price."
        else:
            action = "monitor"
            reason = "Performance is within healthy thresholds."

        recommendations.append(
            {
                "variant_id": variant_id,
                "variant_name": f"{variant.product.name} / {variant.name}",
                "units_sold": units_sold,
                "stock_on_hand": stock,
                "coverage_weeks": round(coverage_weeks, 2) if coverage_weeks != float("inf") else None,
                "margin": round(margin, 2),
                "action": action,
                "reason": reason,
                "trend_label": "high" if coverage_weeks < 2 else "low" if units_sold == 0 else "steady",
            }
        )

    return {"generated_at": timezone.now().isoformat(), "recommendations": recommendations}


def forecast_product_demand(organization_id: int) -> dict[str, list[dict[str, object]]]:
    """Estimate demand velocity for each variant using a trailing window."""

    window_start = timezone.now() - timedelta(days=56)
    lines_qs = (
        _order_lines_for_org(organization_id)
        .filter(order__ordered_at__gte=window_start)
        .values("product_variant")
        .annotate(units=Coalesce(Sum("quantity"), 0))
    )
    lines = list(lines_qs)
    variant_ids = [row["product_variant"] for row in lines]
    variants = ProductVariant.objects.select_related("product").in_bulk(variant_ids)
    weeks = max((timezone.now() - window_start).days / 7, 1)

    high_demand: list[dict[str, object]] = []
    low_velocity: list[dict[str, object]] = []

    for row in lines:
        variant = variants.get(row["product_variant"])
        if not variant:
            continue
        velocity = float(row["units"]) / weeks
        entry = {
            "variant_id": variant.id,
            "variant_name": f"{variant.product.name} / {variant.name}",
            "velocity": round(velocity, 2),
        }
        if velocity >= 10:
            high_demand.append(entry)
        elif velocity < 2:
            low_velocity.append(entry)

    return {"high_demand": high_demand, "low_velocity": low_velocity}


def suggest_next_best_actions(organization_id: int) -> list[dict[str, object]]:
    """Propose next best actions for opportunities based on deal signals."""

    upcoming_actions: list[dict[str, object]] = []
    cutoff = timezone.now() - timedelta(days=5)

    opportunities = (
        Opportunity.objects.filter(organization_id=organization_id)
        .select_related("owner", "stage", "pipeline")
        .order_by("-amount")[:50]
    )
    for opp in opportunities:
        recent_activity = opp.activities.filter(completed_at__gte=cutoff).first()
        next_due = opp.activities.filter(completed_at__isnull=True).order_by("due_at").first()
        if not next_due:
            upcoming_actions.append(
                {
                    "opportunity_id": opp.id,
                    "summary": f"Schedule follow-up for {opp.name}",
                    "reason": "No upcoming activity is scheduled.",
                }
            )
        elif next_due.due_at and next_due.due_at < timezone.now():
            upcoming_actions.append(
                {
                    "opportunity_id": opp.id,
                    "summary": f"Complete overdue task '{next_due.subject}'",
                    "reason": "Next best action is overdue; completing it keeps pipeline velocity healthy.",
                }
            )
        elif not recent_activity:
            upcoming_actions.append(
                {
                    "opportunity_id": opp.id,
                    "summary": f"Engage {opp.name} with a touchpoint",
                    "reason": "No recent activity in the past 5 days.",
                }
            )

    dormant_leads = (
        DealActivity.objects.filter(
            opportunity__organization_id=organization_id,
            completed_at__isnull=True,
            due_at__lt=timezone.now(),
        )
        .select_related("opportunity")
        .order_by("due_at")[:20]
    )
    for activity in dormant_leads:
        upcoming_actions.append(
            {
                "opportunity_id": activity.opportunity_id,
                "summary": f"Re-engage on '{activity.subject}'",
                "reason": "Task is overdue and may jeopardize the deal.",
            }
        )

    return upcoming_actions
