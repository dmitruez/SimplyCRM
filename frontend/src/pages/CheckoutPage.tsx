import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import styles from './CheckoutPage.module.css';
import { pricingApi } from '../api/pricing';
import { Button } from '../components/ui/Button';
import { notificationBus } from '../components/notifications/notificationBus';

const useQueryParams = () => new URLSearchParams(useLocation().search);

export const CheckoutPage = () => {
  const queryParams = useQueryParams();
  const navigate = useNavigate();
  const planFromQuery = queryParams.get('plan');
  const cycleFromQuery = queryParams.get('cycle');
  const initialCycle = cycleFromQuery === 'annual' ? 'annual' : 'monthly';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(planFromQuery);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialCycle);

  const { data: plans = [] } = useQuery({
    queryKey: ['pricing', 'plans'],
    queryFn: pricingApi.listPlans,
    staleTime: 300_000
  });

  const selectedPlan = useMemo(() => {
    if (!plans.length) return undefined;
    if (selectedPlanKey) {
      const match = plans.find((plan) => plan.key === selectedPlanKey);
      if (match) {
        return match;
      }
    }
    return plans[0];
  }, [plans, selectedPlanKey]);

  const handlePlanChange = (event: FormEvent<HTMLSelectElement>) => {
    setSelectedPlanKey(event.currentTarget.value);
  };

  const handleCheckout = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPlan) {
      notificationBus.publish({
        type: 'error',
        title: 'План не выбран',
        message: 'Выберите тариф для продолжения.'
      });
      return;
    }

    notificationBus.publish({
      type: 'success',
      title: 'Заявка отправлена',
      message: 'Мы сохранили ваш запрос на активацию. Менеджер свяжется с вами для завершения оплаты.'
    });
    navigate('/crm');
  };

  const pricePerMonth = selectedPlan?.pricePerMonth ?? 0;
  const monthlyTotal = pricePerMonth;
  const annualTotal = Math.round(pricePerMonth * 12 * 0.9); // 10% скидка
  const payable = billingCycle === 'monthly' ? monthlyTotal : annualTotal;

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Оформление — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>Оформление подписки</h1>
          <p>Выберите тариф, укажите данные оплаты и активируйте SimplyCRM.</p>
        </div>
      </header>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Тарифный план</h2>
          <form className={styles.form} onSubmit={handleCheckout}>
            <label>
              План
              <select value={selectedPlan?.key ?? ''} onChange={handlePlanChange}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.key}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Период оплаты
              <select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as 'monthly' | 'annual')}>
                <option value="monthly">Ежемесячно</option>
                <option value="annual">Ежегодно (скидка 10%)</option>
              </select>
            </label>
            <label>
              Держатель карты
              <input required placeholder="Имя и фамилия" />
            </label>
            <label>
              Номер карты
              <input required placeholder="1234 5678 9012 3456" maxLength={19} />
            </label>
            <label>
              Срок действия
              <input required placeholder="MM/YY" maxLength={5} />
            </label>
            <label>
              CVC
              <input required placeholder="123" maxLength={4} />
            </label>
            <div className={styles.actions}>
              <Button type="submit">Подтвердить</Button>
            </div>
          </form>
        </section>
        <section className={styles.card}>
          <h2>Итог</h2>
          {selectedPlan ? (
            <>
              <div className={styles.summaryRow}>
                <span>План</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Оплата</span>
                <span>{billingCycle === 'monthly' ? 'Ежемесячно' : 'Ежегодно'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Сумма</span>
                <span>
                  {payable.toLocaleString('ru-RU')} {selectedPlan.currency}
                </span>
              </div>
              <div>
                <h3>Включено</h3>
                <ul>
                  {selectedPlan.featureFlags.map((flag) => (
                    <li key={flag.code}>{flag.label}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>Загрузка тарифов…</p>
          )}
        </section>
      </div>
    </div>
  );
};
