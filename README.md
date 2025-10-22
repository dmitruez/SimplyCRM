# SimplyCRM Backend

SimplyCRM is a multi-tenant CRM backend implemented with Django and Django REST Framework. It supports tiered subscription plans, advanced analytics, automation, and integration tooling inspired by enterprise-grade CRM solutions.

## Features

- **Core tenanting and subscriptions** with feature-flag based access control.
- **Product catalog** management including suppliers, variants, pricing history, and inventory.
- **Sales pipeline** tracking for leads, opportunities, orders, invoicing, and fulfillment.
- **Advanced analytics** with deep demand forecasting, price recommendations, anomaly detection, and next-best-action guidance.
- **Automation engine** for campaigns, notifications, and rule-based workflows.
- **Integrations module** exposing API keys, webhooks, connectors, and import jobs.
- **AI co-pilot** powered by OpenAI with full-context answers sourced from live CRM metrics.

## Project Structure

```
manage.py
simplycrm/
├── analytics/
├── automation/
├── catalog/
├── assistant/
├── core/
├── integrations/
└── sales/
```

Each app exposes REST endpoints registered under `/api/` via DRF routers. Feature flag enforcement is provided through `HasFeaturePermission`.

## Getting Started

1. Install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Apply migrations and create a superuser:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

3. Run the development server:

   ```bash
   python manage.py runserver
   ```

4. Access the browsable API at `http://localhost:8000/api/`, the interactive Swagger UI at `http://localhost:8000/api/docs/` (OpenAPI schema is served at `/api/schema/`), and the data-rich dashboard UI at `http://localhost:8000/dashboard/` (authentication required).

## Authentication & Security

- Obtain a personal API token via `POST /api/auth/token/` with a JSON payload containing `username` and `password`.
- Revoke the active token with `POST /api/auth/token/revoke/`.
- Login endpoints are guarded by cache-backed brute-force protection with configurable thresholds through environment variables:

  | Variable | Default | Description |
  | --- | --- | --- |
  | `DJANGO_LOGIN_MAX_ATTEMPTS` | `5` | Failed attempts allowed before lockout. |
  | `DJANGO_LOGIN_ATTEMPT_WINDOW` | `900` | Rolling window (seconds) for counting failures. |
  | `DJANGO_LOGIN_LOCKOUT_SECONDS` | `900` | Lockout duration after exceeding attempts. |
  | `DJANGO_REST_LOGIN_RATE` | `10/min` | DRF throttle applied per username/IP pair. |

- HTTPS hardening flags (HSTS, secure cookies, referrer policy) are enabled automatically when `DJANGO_DEBUG=0`. Override `DJANGO_SECURE_*` variables for production deployments behind load balancers.

### Registration & Social Login

- Self-service signups are available at `POST /api/auth/register/`. Provide an `email`, `password`, and optional `first_name`, `last_name`, or `organization_name`. A dedicated workspace is created automatically with the Free subscription tier.
- Google sign-in is enabled via `POST /api/auth/google/` accepting a `token` (Google ID token) and optional `organization_name`. Existing accounts are linked by email while new users receive a fresh workspace.
- Configure accepted Google audiences through the `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated) or `GOOGLE_OAUTH_CLIENT_ID` environment variables. Tokens issued for other client IDs are rejected. Only verified Google emails may authenticate.

## Subscription Plans & Feature Codes

Feature flags determine which endpoints are available per subscription tier. Example feature codes include:

- `billing.manage_subscriptions` – manage organization subscriptions.
- `catalog.manage_suppliers` – access supplier endpoints.
- `sales.order_management` – manage orders and lines.
- `analytics.forecasting` – use forecasting endpoints.
- `analytics.insights` – access demand, pricing, and next-best-action analytics.
- `assistant.chat` – interact with the GPT-powered co-pilot.
- `automation.rules` – manage automation rules.
- `integrations.api_keys` – manage API keys.

Populate `SubscriptionPlan` and `FeatureFlag` models via the admin or fixtures to tailor plan capabilities.

## Admin Interface

- SimplyCRM ships with the [Django Jet Reboot](https://github.com/geex-arts/django-jet-reboot) control panel for a modern management experience.
- Access the Jet dashboards at `/jet/` and `/jet/dashboard/`. The classic Django admin remains available at `/admin/` for compatibility.
- Customize the Jet theme via the `DJANGO_JET_DEFAULT_THEME` environment variable. Additional color presets are available out-of-the-box.

## Background Tasks & Integrations

Celery and Redis are configured via environment variables for asynchronous tasks and scheduled analytics. External integrations can be registered via the Integrations module and executed using the Automation webhooks or DataSource models.

## AI Assistant

1. Install the optional OpenAI dependency (already listed in `requirements.txt`) and set `OPENAI_API_KEY` in your environment.
2. Create a conversation via `POST /api/ai/conversations/` with a `title` and optional `system_prompt`.
3. Submit questions through `POST /api/ai/conversations/{id}/ask/` providing a JSON payload with `prompt`.
4. The assistant aggregates:
   - Sales KPIs (`/api/insight-analytics/sales-metrics/`)
   - Demand forecasts (`/api/insight-analytics/demand-forecast/`)
   - Price suggestions (`/api/insight-analytics/price-recommendations/`)
   - Next best actions for deals (`/api/insight-analytics/next-best-actions/`)
   - Detected anomalies

If the OpenAI client is unavailable or no API key is provided, the assistant gracefully returns diagnostic guidance so you can finish configuring the integration.

## Testing

Run the Django test suite:

```bash
python manage.py test
```

Automated testing and linting can be integrated via CI/CD pipelines according to your deployment strategy.
