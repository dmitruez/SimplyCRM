import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import { PricingCard } from '../components/ui/PricingCard';
import { pricingApi } from '../api/pricing';
import { Button } from '../components/ui/Button';
import styles from './PricingPage.module.css';
import { PricingPlan } from '../types/pricing';

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);

const fallbackPlans: PricingPlan[] = [
  {
    id: 1,
    name: 'Starter',
    billingPeriod: 'monthly',
    price: 0,
    currency: 'RUB',
    trialDays: 14,
    featureFlags: [
      { code: 'catalog.read', label: 'Каталог: просмотр' },
      { code: 'sales.pipeline', label: 'Канбан сделок (до 3 воронок)' },
      { code: 'assistant.chat', label: 'AI-ассистент (10 вопросов)' }
    ]
  },
  {
    id: 2,
    name: 'Growth',
    billingPeriod: 'monthly',
    price: 5900,
    currency: 'RUB',
    trialDays: 14,
    featureFlags: [
      { code: 'catalog.manage', label: 'Каталог: полный CRUD' },
      { code: 'sales.order_management', label: 'Заказы и счета' },
      { code: 'analytics.forecasting', label: 'Прогноз спроса' },
      { code: 'assistant.chat', label: 'AI-ассистент (безлимит)' }
    ]
  },
  {
    id: 3,
    name: 'Scale',
    billingPeriod: 'monthly',
    price: 12900,
    currency: 'RUB',
    trialDays: 30,
    featureFlags: [
      { code: 'automation.rules', label: 'Автоматизация процессов' },
      { code: 'integrations.api_keys', label: 'Интеграции и вебхуки' },
      { code: 'analytics.insights', label: 'Глубокие отчеты и рекомендации' },
      { code: 'assistant.chat', label: 'AI-ассистент с инсайтами' }
    ]
  }
];

export const PricingPage = () => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const { data, isLoading } = useQuery({
    queryKey: ['pricing', 'plans'],
    queryFn: pricingApi.listPlans,
    staleTime: 5 * 60 * 1000
  });

  const plans = useMemo(() => data ?? fallbackPlans, [data]);

  const preparedPlans = useMemo(
    () =>
      plans.map((plan) => {
        if (plan.price === 0) {
          return {
            plan,
            priceLabel: 'Бесплатно'
          };
        }

        const basePrice = plan.billingPeriod === 'yearly' ? plan.price / 12 : plan.price;
        const priceValue = billing === 'yearly' ? basePrice * 12 * 0.85 : basePrice;
        const label = `${formatPrice(priceValue, plan.currency)} / ${billing === 'yearly' ? 'год' : 'месяц'}`;

        return {
          plan,
          priceLabel: label
        };
      }),
    [billing, plans]
  );

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Тарифы SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <h1>Тарифные планы SimplyCRM</h1>
        <p>Выберите оптимальный пакет для вашей команды. Переключайтесь между помесячной и годовой оплатой.</p>
        <div className={styles.toggle} role="group" aria-label="Период оплаты">
          <Button
            variant={billing === 'monthly' ? 'primary' : 'secondary'}
            onClick={() => setBilling('monthly')}
          >
            Месяц
          </Button>
          <Button
            variant={billing === 'yearly' ? 'primary' : 'secondary'}
            onClick={() => setBilling('yearly')}
          >
            Год (-15%)
          </Button>
        </div>
      </header>
      <section className={styles.plansGrid}>
        {preparedPlans.map(({ plan, priceLabel }) => (
          <PricingCard
            key={plan.id}
            planName={plan.name}
            priceLabel={priceLabel}
            description={`Пробный период ${plan.trialDays} дней`}
            features={plan.featureFlags.map((flag) => ({
              label: flag.label,
              enabled: flag.enabled ?? true
            }))}
            ctaLabel={plan.price === 0 ? 'Начать бесплатно' : 'Попробовать'}
            highlighted={plan.name === 'Growth'}
            onCtaClick={() => {
              // eslint-disable-next-line no-alert
              window.alert('Интеграция с платежным провайдером будет подключена через backend.');
            }}
          />
        ))}
      </section>
      {isLoading ? <p>Загружаем данные из SubscriptionPlan...</p> : null}
    </div>
  );
};
