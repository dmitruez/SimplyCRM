# SimplyCRM Backend

SimplyCRM is a multi-tenant CRM backend implemented with Django and Django REST Framework. It supports tiered subscription plans, advanced analytics, automation, and integration tooling inspired by enterprise-grade CRM solutions.

## Features

- **Core tenanting and subscriptions** with feature-flag based access control.
- **Product catalog** management including suppliers, variants, pricing history, and inventory.
- **Sales pipeline** tracking for leads, opportunities, orders, invoicing, and fulfillment.
- **Advanced analytics** entities with endpoints for dashboards, forecasting, segments, and insights.
- **Automation engine** for campaigns, notifications, and rule-based workflows.
- **Integrations module** exposing API keys, webhooks, connectors, and import jobs.

## Project Structure

```
manage.py
simplycrm/
├── analytics/
├── automation/
├── catalog/
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

4. Access the browsable API at `http://localhost:8000/api/`.

## Subscription Plans & Feature Codes

Feature flags determine which endpoints are available per subscription tier. Example feature codes include:

- `billing.manage_subscriptions` – manage organization subscriptions.
- `catalog.manage_suppliers` – access supplier endpoints.
- `sales.order_management` – manage orders and lines.
- `analytics.forecasting` – use forecasting endpoints.
- `automation.rules` – manage automation rules.
- `integrations.api_keys` – manage API keys.

Populate `SubscriptionPlan` and `FeatureFlag` models via the admin or fixtures to tailor plan capabilities.

## Background Tasks & Integrations

Celery and Redis are configured via environment variables for asynchronous tasks and scheduled analytics. External integrations can be registered via the Integrations module and executed using the Automation webhooks or DataSource models.

## Testing

Run the Django test suite:

```bash
python manage.py test
```

Automated testing and linting can be integrated via CI/CD pipelines according to your deployment strategy.
