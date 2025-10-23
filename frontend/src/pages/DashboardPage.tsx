import { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';

import styles from './DashboardPage.module.css';
import { Card } from '../components/ui/Card';
import { MetricTile } from '../components/ui/MetricTile';
import { Button } from '../components/ui/Button';
import { useAuthContext } from '../providers/AuthProvider';

const CatalogModule = lazy(() => import('../sections/CatalogSection'));
const SalesModule = lazy(() => import('../sections/SalesSection'));
const AnalyticsModule = lazy(() => import('../sections/AnalyticsSection'));
const AutomationModule = lazy(() => import('../sections/AutomationSection'));
const IntegrationsModule = lazy(() => import('../sections/IntegrationsSection'));
const AssistantModule = lazy(() => import('../sections/AssistantSection'));

const metrics = [
  { title: 'Выручка', value: '₽4.2M', delta: '+12% к прошлому месяцу' },
  { title: 'Активные фичи', value: '12', delta: 'Feature flags включены' },
  { title: 'AI инсайты', value: '87', delta: 'Последние 7 дней' }
];

export const DashboardPage = () => {
  const { isFeatureEnabled } = useAuthContext();

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>SimplyCRM — Рабочая область</title>
      </Helmet>
      <header className={styles.sectionHeader}>
        <div>
          <h1>Дашборд SimplyCRM</h1>
          <p>Рабочие панели, AI-подсказки и статус интеграций в едином окне.</p>
        </div>
        <Button variant="secondary">Обновить данные</Button>
      </header>
      <section>
        <div className={styles.grid}>
          {metrics.map((metric) => (
            <MetricTile
              key={metric.title}
              title={metric.title}
              value={metric.value}
              deltaLabel={metric.delta}
            />
          ))}
        </div>
      </section>
      <Suspense fallback={<Card>Загружаем данные каталога...</Card>}>
        {isFeatureEnabled('catalog.manage_suppliers') ? <CatalogModule /> : null}
      </Suspense>
      <Suspense fallback={<Card>Загружаем сделки...</Card>}>
        {isFeatureEnabled('sales.order_management') ? <SalesModule /> : null}
      </Suspense>
      <Suspense fallback={<Card>Аналитика подгружается...</Card>}>
        {isFeatureEnabled('analytics.insights') ? <AnalyticsModule /> : null}
      </Suspense>
      <Suspense fallback={<Card>Автоматизация подгружается...</Card>}>
        {isFeatureEnabled('automation.rules') ? <AutomationModule /> : null}
      </Suspense>
      <Suspense fallback={<Card>Интеграции подгружаются...</Card>}>
        {isFeatureEnabled('integrations.api_keys') ? <IntegrationsModule /> : null}
      </Suspense>
      <Suspense fallback={<Card>Чат ассистента готовится...</Card>}>
        {isFeatureEnabled('assistant.chat') ? <AssistantModule /> : null}
      </Suspense>
    </div>
  );
};
