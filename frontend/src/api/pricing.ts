import { apiClient } from './apiClient';
import { PricingPlan } from '../types/pricing';

interface SubscriptionPlanResponse {
  id: number;
  key: string;
  name: string;
  description?: string;
  price_per_month: string | number;
}

const featureCatalog: Record<string, { code: string; label: string }[]> = {
  free: [
    { code: 'catalog.read', label: 'Каталог: просмотр' },
    { code: 'sales.pipeline', label: 'Канбан сделок (до 3 воронок)' },
    { code: 'assistant.chat', label: 'AI-ассистент (10 вопросов)' }
  ],
  pro: [
    { code: 'catalog.manage', label: 'Каталог: полный CRUD' },
    { code: 'sales.order_management', label: 'Заказы и счета' },
    { code: 'analytics.forecasting', label: 'Прогноз спроса' },
    { code: 'assistant.chat', label: 'AI-ассистент (безлимит)' }
  ],
  enterprise: [
    { code: 'automation.rules', label: 'Автоматизация процессов' },
    { code: 'integrations.api_keys', label: 'Интеграции и вебхуки' },
    { code: 'analytics.insights', label: 'Глубокие отчеты и рекомендации' },
    { code: 'assistant.chat', label: 'AI-ассистент с инсайтами' }
  ]
};

export const pricingApi = {
  async listPlans(): Promise<PricingPlan[]> {
    const { data } = await apiClient.get<SubscriptionPlanResponse[]>('/subscription-plans/');
    return data.map((plan) => ({
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
