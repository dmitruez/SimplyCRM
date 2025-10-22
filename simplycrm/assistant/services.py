"""Integration layer for the GPT-powered assistant."""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterable

from django.utils import timezone

from simplycrm.analytics import services as analytics_services

try:  # pragma: no cover - optional dependency during tests
    from openai import OpenAI
except Exception:  # pragma: no cover - keep runtime resilient without openai package
    OpenAI = None  # type: ignore


LOGGER = logging.getLogger(__name__)


def build_operational_context(organization_id: int) -> dict[str, Any]:
    """Gather key metrics that the assistant can reason about."""

    context = {
        "generated_at": timezone.now().isoformat(),
        "sales_metrics": analytics_services.aggregate_sales_metrics(organization_id),
        "anomalies": analytics_services.detect_sales_anomalies(organization_id),
        "price_recommendations": analytics_services.recommend_price_actions(organization_id),
        "demand_forecast": analytics_services.forecast_product_demand(organization_id),
        "next_best_actions": analytics_services.suggest_next_best_actions(organization_id),
    }
    return context


def render_context_as_markdown(context: dict[str, Any]) -> str:
    """Format context payload as markdown for LLM consumption."""

    sections: list[str] = ["## Operational Snapshot"]
    sections.append(f"Generated at: {context['generated_at']}")

    metrics = context.get("sales_metrics", {})
    if metrics:
        sections.append("\n### Sales Metrics")
        for key, value in metrics.items():
            sections.append(f"- **{key.replace('_', ' ').title()}**: {value}")

    price_recos = context.get("price_recommendations", {})
    if price_recos:
        sections.append("\n### Price Recommendations")
        for recommendation in price_recos.get("recommendations", []):
            sections.append(
                f"- {recommendation['variant_name']} → {recommendation['action']} (trend: {recommendation['trend_label']})"
            )

    demand = context.get("demand_forecast", {})
    if demand:
        sections.append("\n### Demand Outlook")
        for item in demand.get("high_demand", []):
            sections.append(
                f"- High demand: {item['variant_name']} ({item['velocity']} units/week)"
            )
        for item in demand.get("low_velocity", []):
            sections.append(
                f"- Slow mover: {item['variant_name']} ({item['velocity']} units/week)"
            )

    nba = context.get("next_best_actions", [])
    if nba:
        sections.append("\n### Next Best Actions")
        for action in nba:
            sections.append(f"- {action['summary']} (reason: {action['reason']})")

    anomalies = context.get("anomalies", [])
    if anomalies:
        sections.append("\n### Detected Anomalies")
        for anomaly in anomalies:
            sections.append(f"- {anomaly['type']}: {anomaly['message']}")

    sections.append("\n### Raw Context JSON")
    sections.append(f"```json\n{json.dumps(context, default=str, indent=2)}\n```")
    return "\n".join(sections)


def call_chat_completion(system_prompt: str, messages: Iterable[dict[str, str]]) -> dict[str, Any]:
    """Send a chat completion request to OpenAI, if configured."""

    if OpenAI is None:
        LOGGER.warning("openai package is unavailable; returning stubbed response")
        return {
            "content": "OpenAI client is not installed. Provide OPENAI_API_KEY and install openai to enable replies.",
            "usage": {"total_tokens": 0},
        }

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        LOGGER.warning("OPENAI_API_KEY missing; returning stubbed response")
        return {
            "content": "OPENAI_API_KEY is not configured on the server; unable to reach OpenAI.",
            "usage": {"total_tokens": 0},
        }

    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}, *messages],
        temperature=0.3,
        max_tokens=800,
    )
    choice = completion.choices[0]
    return {
        "content": choice.message.content or "",
        "usage": completion.usage or {"total_tokens": 0},
    }


def run_ai_analysis(system_prompt: str, user_prompt: str, organization_id: int) -> dict[str, Any]:
    """Execute an AI analysis using operational context and a user question."""

    context = build_operational_context(organization_id)
    context_markdown = render_context_as_markdown(context)
    messages = [
        {
            "role": "user",
            "content": (
                "You are assisting with CRM analytics. Use the provided context to answer.\n"
                f"Context:\n{context_markdown}\n\nUser question: {user_prompt}"
            ),
        }
    ]
    result = call_chat_completion(system_prompt, messages)
    result["context"] = context
    return result
