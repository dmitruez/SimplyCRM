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
        'sales.pipeline': {
            'name': 'Воронки продаж',
            'description': 'Управление стадиями сделок и визуализация pipeline.'
        },
        'assistant.chat': {
            'name': 'AI-ассистент',
            'description': 'Подсказки и ответы на вопросы по данным CRM.'
        },
        'catalog.manage': {
            'name': 'Каталог: управление',
            'description': 'Создание и обновление товаров и категорий.'
        },
        'sales.order_management': {
            'name': 'Управление заказами',
            'description': 'Обработка заказов, счетов и оплат.'
        },
        'analytics.forecasting': {
            'name': 'Прогнозирование',
            'description': 'Прогноз спроса и выручки с помощью аналитики.'
        },
        'automation.rules': {
            'name': 'Автоматизации',
            'description': 'Настройка бизнес-правил и автоматических сценариев.'
        },
        'integrations.api_keys': {
            'name': 'Интеграции и API-ключи',
            'description': 'Управление внешними интеграциями и доступом к API.'
        },
        'analytics.insights': {
            'name': 'Глубокая аналитика',
            'description': 'Детализированные отчеты и рекомендации по данным.'
        },
    }

    feature_instances = {}
    for code, defaults in features.items():
        feature, _ = FeatureFlag.objects.update_or_create(code=code, defaults=defaults)
        feature_instances[code] = feature

    plan_features = {
        'free': ['catalog.read', 'sales.pipeline', 'assistant.chat'],
        'pro': ['catalog.read', 'catalog.manage', 'sales.pipeline', 'sales.order_management', 'analytics.forecasting', 'assistant.chat'],
        'enterprise': ['catalog.read', 'catalog.manage', 'sales.pipeline', 'sales.order_management', 'analytics.forecasting', 'assistant.chat', 'automation.rules', 'integrations.api_keys', 'analytics.insights'],
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
