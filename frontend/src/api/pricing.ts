import {apiClient} from './apiClient';
import {PricingPlan} from '../types/pricing';

interface SubscriptionPlanResponse {
    id: number;
    key: string;
    name: string;
    description?: string;
    price_per_month: string | number;
}

const featureCatalog: Record<string, { code: string; label: string }[]> = {
    free: [
        {code: 'catalog.read', label: 'Каталог: просмотр'},
        {code: 'sales.pipeline', label: 'Канбан сделок (до 3 воронок)'},
        {code: 'assistant.chat', label: 'AI-ассистент (10 вопросов)'}
    ],
    pro: [
        {code: 'catalog.manage', label: 'Каталог: полный CRUD'},
        {code: 'catalog.manage_suppliers', label: 'Поставщики и закупки'},
        {code: 'inventory.advanced_tracking', label: 'Партионный учет и остатки'},
        {code: 'pricing.history_view', label: 'История изменения цен'},
        {code: 'sales.advanced_pipeline', label: 'Расширенные стадии сделок'},
        {code: 'sales.order_management', label: 'Заказы и счета'},
        {code: 'billing.invoices', label: 'Выставление счетов и оплаты'},
        {code: 'analytics.standard', label: 'Базовые отчеты и дашборды'},
        {code: 'analytics.forecasting', label: 'Прогноз спроса и next best action'},
        {code: 'analytics.customer_segments', label: 'RFM и сегментация клиентов'},
        {code: 'assistant.chat', label: 'AI-ассистент (безлимит)'}
    ],
    enterprise: [
        {code: 'automation.rules', label: 'Автоматизация процессов'},
        {code: 'automation.campaigns', label: 'Маркетинговые кампании'},
        {code: 'automation.notifications', label: 'Уведомления и сценарии'},
        {code: 'automation.webhooks', label: 'Авто-вебхуки'},
        {code: 'integrations.api_keys', label: 'API-ключи и лимиты'},
        {code: 'integrations.connectors', label: 'Готовые коннекторы и логи'},
        {code: 'integrations.imports', label: 'Импорт данных и пайплайны'},
        {code: 'analytics.insights', label: 'Глубокие отчеты и рекомендации'},
        {code: 'analytics.automated_reports', label: 'Автоматические отчеты'},
        {code: 'analytics.mlops', label: 'Контроль ML-моделей'},
        {code: 'assistant.chat', label: 'AI-ассистент с инсайтами'}
    ]
};

export const pricingApi = {
    async listPlans(): Promise<PricingPlan[]> {
        const {data} = await apiClient.get<SubscriptionPlanResponse[] | { results: SubscriptionPlanResponse[] }>('/subscription-plans/');
        const plans = Array.isArray(data) ? data : data?.results ?? [];

        return plans.map((plan) => ({
            id: plan.id,
            key: plan.key,
            name: plan.name,
            description: plan.description,
            pricePerMonth: typeof plan.price_per_month === 'string'
                ? Number.parseFloat(plan.price_per_month)
                : plan.price_per_month,
            currency: 'RUB',
            trialDays: plan.key === 'free' ? 30 : 14,
            featureFlags: (featureCatalog[plan.key] ?? []).map((flag) => ({
                ...flag,
                enabled: true
            }))
        }));
    }
};
