"""High-level analytics services and ML stubs."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Iterable

from django.db.models import Avg, F, Sum

from simplycrm.sales.models import Order, OrderLine


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
