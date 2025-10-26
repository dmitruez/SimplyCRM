from __future__ import annotations

from django.db import migrations


def seed_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model('core', 'SubscriptionPlan')
    FeatureFlag = apps.get_model('core', 'FeatureFlag')

    plans = {
        'free': {
            'name': 'Free',
            'description': 'Бесплатный старт для небольших команд.',
            'price_per_month': 0,
            'max_users': 5,
            'max_deals': 500,
            'max_api_calls_per_minute': 60,
        },
        'pro': {
            'name': 'Pro',
            'description': 'Расширенные инструменты продаж и аналитики.',
            'price_per_month': 5900,
            'max_users': 25,
            'max_deals': 5000,
            'max_api_calls_per_minute': 240,
        },
        'enterprise': {
            'name': 'Enterprise',
            'description': 'Максимум возможностей, автоматизация и интеграции.',
            'price_per_month': 12900,
            'max_users': 100,
            'max_deals': 20000,
            'max_api_calls_per_minute': 600,
        },
    }

    plan_instances = {}
    for key, defaults in plans.items():
        plan, _ = SubscriptionPlan.objects.update_or_create(key=key, defaults=defaults)
        plan_instances[key] = plan

    features = {
        'catalog.read': {
            'name': 'Каталог: просмотр',
            'description': 'Просмотр товаров и категорий в каталоге.'
        },
        'catalog.manage': {
            'name': 'Каталог: управление',
            'description': 'Создание и обновление товаров и категорий.'
        },
        'catalog.manage_suppliers': {
            'name': 'Поставщики',
            'description': 'Работа с поставщиками и контактами закупок.'
        },
        'inventory.advanced_tracking': {
            'name': 'Учет запасов',
            'description': 'Партионный учет, отслеживание партий и сроков годности.'
        },
        'pricing.history_view': {
            'name': 'История цен',
            'description': 'Анализ динамики цен и изменение прайсов.'
        },
        'sales.pipeline': {
            'name': 'Воронки продаж',
            'description': 'Управление стадиями сделок и визуализация pipeline.'
        },
        'sales.advanced_pipeline': {
            'name': 'Расширенный pipeline',
            'description': 'Продвинутые этапы сделок, активностей и задач.'
        },
        'sales.order_management': {
            'name': 'Управление заказами',
            'description': 'Обработка заказов, счетов и оплат.'
        },
        'billing.invoices': {
            'name': 'Выставление счетов',
            'description': 'Создание и отслеживание счетов для клиентов.'
        },
        'billing.payments': {
            'name': 'Платежи',
            'description': 'Регистрация оплат и сверка транзакций.'
        },
        'billing.manage_subscriptions': {
            'name': 'Управление подписками',
            'description': 'Переключение тарифных планов и управление подписками.'
        },
        'logistics.shipments': {
            'name': 'Отгрузки',
            'description': 'Контроль статусов отгрузок и трекинг доставок.'
        },
        'analytics.standard': {
            'name': 'Базовая аналитика',
            'description': 'Доступ к стандартным метрикам и дашбордам.'
        },
        'analytics.custom_metrics': {
            'name': 'Пользовательские метрики',
            'description': 'Настройка собственных метрик и KPI.'
        },
        'analytics.automated_reports': {
            'name': 'Автоотчеты',
            'description': 'Автоматическая генерация и рассылка отчетов.'
        },
        'analytics.forecasting': {
            'name': 'Прогнозирование',
            'description': 'Прогноз спроса и выручки с помощью аналитики.'
        },
        'analytics.customer_segments': {
            'name': 'Сегментация клиентов',
            'description': 'RFM-анализ и сегментация клиентской базы.'
        },
        'analytics.mlops': {
            'name': 'ML Ops',
            'description': 'Контроль обучений и качества ML моделей.'
        },
        'analytics.integrations': {
            'name': 'Интеграция данных',
            'description': 'Загрузка данных из внешних источников и лог синхронизаций.'
        },
        'analytics.insights': {
            'name': 'Глубокая аналитика',
            'description': 'Детализированные отчеты и рекомендации по данным.'
        },
        'assistant.chat': {
            'name': 'AI-ассистент',
            'description': 'Подсказки и ответы на вопросы по данным CRM.'
        },
        'automation.core': {
            'name': 'Automation Core',
            'description': 'Базовые возможности платформы автоматизации.'
        },
        'automation.rules': {
            'name': 'Автоматизации',
            'description': 'Настройка бизнес-правил и автоматических сценариев.'
        },
        'automation.campaigns': {
            'name': 'Кампании',
            'description': 'Оркестрация маркетинговых кампаний и касаний.'
        },
        'automation.notifications': {
            'name': 'Уведомления',
            'description': 'Рассылки и уведомления по событиям CRM.'
        },
        'automation.webhooks': {
            'name': 'Авто-вебхуки',
            'description': 'Отправка вебхуков при наступлении событий.'
        },
        'integrations.core': {
            'name': 'Интеграции',
            'description': 'Базовые возможности интеграционной платформы.'
        },
        'integrations.api_keys': {
            'name': 'Интеграции и API-ключи',
            'description': 'Управление внешними интеграциями и доступом к API.'
        },
        'integrations.webhooks': {
            'name': 'Вебхуки',
            'description': 'Подписки на события и управление секретами.'
        },
        'integrations.connectors': {
            'name': 'Коннекторы',
            'description': 'Настройка подключений к внешним системам.'
        },
        'integrations.imports': {
            'name': 'Импорт данных',
            'description': 'Импорт данных и отслеживание статусов загрузок.'
        },
        'compliance.audit_logs': {
            'name': 'Аудит логов',
            'description': 'Просмотр и экспорт журналов аудита.'
        },
    }

    feature_instances = {}
    for code, defaults in features.items():
        feature, _ = FeatureFlag.objects.update_or_create(code=code, defaults=defaults)
        feature_instances[code] = feature

    plan_features = {
        'free': [
            'catalog.read',
            'sales.pipeline',
            'assistant.chat',
        ],
        'pro': [
            'catalog.read',
            'catalog.manage',
            'catalog.manage_suppliers',
            'inventory.advanced_tracking',
            'pricing.history_view',
            'sales.pipeline',
            'sales.advanced_pipeline',
            'sales.order_management',
            'billing.invoices',
            'billing.payments',
            'logistics.shipments',
            'analytics.standard',
            'analytics.custom_metrics',
            'analytics.forecasting',
            'analytics.customer_segments',
            'assistant.chat',
        ],
        'enterprise': [
            'catalog.read',
            'catalog.manage',
            'catalog.manage_suppliers',
            'inventory.advanced_tracking',
            'pricing.history_view',
            'sales.pipeline',
            'sales.advanced_pipeline',
            'sales.order_management',
            'billing.invoices',
            'billing.payments',
            'billing.manage_subscriptions',
            'logistics.shipments',
            'analytics.standard',
            'analytics.custom_metrics',
            'analytics.automated_reports',
            'analytics.forecasting',
            'analytics.customer_segments',
            'analytics.mlops',
            'analytics.integrations',
            'analytics.insights',
            'assistant.chat',
            'automation.core',
            'automation.rules',
            'automation.campaigns',
            'automation.notifications',
            'automation.webhooks',
            'integrations.core',
            'integrations.api_keys',
            'integrations.webhooks',
            'integrations.connectors',
            'integrations.imports',
            'compliance.audit_logs',
        ],
    }

    for plan_key, feature_codes in plan_features.items():
        plan = plan_instances.get(plan_key)
        if not plan:
            continue
        plan.feature_flags.set([feature_instances[code] for code in feature_codes if code in feature_instances])


def unseed_plans(apps, schema_editor):
    # We keep seeded plans because removing them may break existing subscriptions.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_plans, unseed_plans),
    ]
