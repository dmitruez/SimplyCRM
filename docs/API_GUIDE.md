# SimplyCRM API Guide

Welcome to the SimplyCRM public API. This document summarises how to authenticate with a personal API key and
highlights the core endpoints that power each subscription tier across the Catalog, Sales, Analytics, Automation and
Integrations modules.

> 💡 A full, machine-readable specification is available at [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/) and a live Swagger UI is
> served at [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/). Use this guide as a human-friendly companion when integrating your product
> with SimplyCRM.

## Authentication

SimplyCRM uses token-based authentication. You can issue a personal API token for any user with valid credentials. The
same token can be used across every API module.

1. Obtain a token:

   ```bash
   curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"username": "demo", "password": "secret"}' \
        http://localhost:8000/api/auth/token/
   ```

   Response:

   ```json
   {
     "access": "0123456789abcdef...",
     "token_type": "Token",
     "profile": {"id": 7, "username": "demo", "feature_flags": [...]} 
   }
   ```

2. Add the token to every request using the `Authorization` header:

   ```bash
   curl -H "Authorization: Token 0123456789abcdef..." \
        http://localhost:8000/api/sales/opportunities/
   ```

3. Revoke the token when it is no longer needed:

   ```bash
   curl -X POST -H "Authorization: Token 0123456789abcdef..." \
        http://localhost:8000/api/auth/token/revoke/
   ```

### Workspace API keys

Organizations on Enterprise plans can mint long-lived workspace keys via the Integrations module:

```bash
curl -X POST -H "Authorization: Token ..." -H "Content-Type: application/json" \
     -d '{"name": "Data warehouse", "permissions": ["sales.read", "catalog.write"]}' \
     http://localhost:8000/api/integrations/api-keys/
```

Each workspace key can be scoped to fine-grained permissions. They are returned only once upon creation, so store them
securely. Use them exactly like personal tokens.

## Base URLs

Every product area exposes a dedicated namespace under `/api/`:

| Module        | Base path                | Description |
|---------------|-------------------------|-------------|
| Catalog API   | `/api/catalog/`         | Products, variants, suppliers, inventory, price history |
| Sales API     | `/api/sales/`           | Companies, contacts, pipelines, deals, notes, files |
| Analytics API | `/api/analytics/`       | Dashboards, metric definitions, forecasts, AI insights |
| Automation API| `/api/automation/`      | Campaigns, rules, notifications, webhook events |
| Integrations API | `/api/integrations/` | API keys, connectors, webhooks, import jobs |
| Assistant API | `/api/assistant/`       | AI conversations and knowledge retrieval |

All endpoints continue to be available under the aggregated `/api/<resource>/` paths for backwards compatibility, but
new integrations should prefer the namespaced URLs above for clarity.

## Catalog API

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Free          | `GET /api/catalog/products/` | List catalogue items available to the workspace. |
| Free          | `GET /api/catalog/categories/` | Retrieve product categories. |
| Pro           | `POST /api/catalog/products/` | Create or update products (requires `catalog.manage_suppliers`). |
| Enterprise    | `GET /api/catalog/price-history/` | Inspect historical pricing for SKU governance. |
| Enterprise    | `POST /api/catalog/inventory-lots/` | Manage distributed inventory and batch tracking. |

## Sales API

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Free          | `GET /api/sales/pipelines/` | Access the standard sales pipeline and stages. |
| Free          | `GET /api/sales/notes/` | Read deal and contact notes. |
| Pro           | `POST /api/sales/opportunities/` | Create opportunities and progress deals. |
| Pro           | `GET /api/sales/orders/` | Retrieve orders, invoices and fulfilment data. |
| Enterprise    | `POST /api/sales/deal-activities/` | Log multi-channel interactions for revenue intelligence. |

## Analytics API

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Free          | `GET /api/analytics/dashboards/` | Access saved dashboards and cards. |
| Pro           | `GET /api/analytics/reports/` | Pull curated performance reports. |
| Pro           | `GET /api/analytics/forecasts/` | Demand & revenue forecasting models. |
| Enterprise    | `GET /api/analytics/insight-analytics/` | AI-powered insights, anomaly detection and recommendations. |
| Enterprise    | `POST /api/analytics/model-training-runs/` | Trigger bespoke ML pipelines for your workspace. |

## Automation API

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Pro           | `GET /api/automation/campaigns/` | Orchestrate multi-step, multi-channel campaigns. |
| Pro           | `POST /api/automation/automation-rules/` | Define workflow triggers and actions. |
| Enterprise    | `POST /api/automation/webhook-events/` | Fire internal webhook events for downstream systems. |
| Enterprise    | `POST /api/automation/notifications/` | Send templated alerts to sales and success teams. |

## Integrations API

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Pro           | `GET /api/integrations/integration-connections/` | Inspect linked connectors (Slack, HubSpot, etc.). |
| Pro           | `POST /api/integrations/import-jobs/` | Launch CSV/XLS import jobs with mapping metadata. |
| Enterprise    | `POST /api/integrations/api-keys/` | Create workspace-scoped API keys. |
| Enterprise    | `POST /api/integrations/webhook-subscriptions/` | Register outbound webhooks with shared secret rotation. |
| Enterprise    | `GET /api/integrations/integration-logs/` | Audit synchronisation runs and payloads. |

## Assistant API

The Assistant API is accessible for teams experimenting with AI copilots:

| Plan          | Endpoint & Method | Description |
|---------------|------------------|-------------|
| Free          | `POST /api/assistant/ai/conversations/` | Start a new assistant conversation. |
| Pro           | `POST /api/assistant/ai/conversations/{id}/ask/` | Submit prompts and receive context-rich answers. |

## Error handling & rate limits

Responses follow standard HTTP semantics. A `401 Unauthorized` indicates a missing or invalid token, while `403
Forbidden` means the workspace lacks the feature flag required for the endpoint. 429 responses include a `Retry-After`
header.

Rate limits are enforced per token and per IP, aligning with your subscription's API quota. Contact support for custom
quotas or burst allowances.

## Testing your integration

For quick smoke tests you can use the included Postman collection or rely on curl scripts. Always create a dedicated
workspace API key for production automation and rotate it regularly using the Integrations API.
