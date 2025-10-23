import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Sparkline } from '../components/charts/Sparkline';
import { analyticsApi } from '../api/analytics';
import { ChannelBreakdown, PerformancePoint } from '../types/analytics';

const AnalyticsSection = () => {
  const { data, isError } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    staleTime: 180_000,
    retry: 1
  });

  const performanceSeries = useMemo(
    () =>
      (data?.performance ?? []).map((point: PerformancePoint) => ({
        label: point.date,
        value: point.revenue
      })),
    [data]
  );

  const channelColumns = useMemo(
    () => [
      { key: 'channel', header: 'Канал' },
      {
        key: 'value',
        header: 'Выручка',
        render: (item: ChannelBreakdown) => `${item.value.toLocaleString('ru-RU')} ₽`
      }
    ],
    []
  );

  return (
    <Card>
      <h2>Аналитика</h2>
      <p>Глубокие отчеты, RFM, прогнозы спроса и next-best-actions.</p>
      {isError ? (
        <p>Аналитика временно недоступна. Проверьте инсайт-эндпоинты.</p>
      ) : (
        <>
          <ul>
            <li>RFM сегменты: {data?.summary.rfmSegments ?? '—'}</li>
            <li>Аномалии и алерты: {data?.summary.demandAlerts ?? '—'}</li>
            <li>Рекомендации цен: {data?.summary.priceRecommendations ?? '—'}</li>
            <li>Next-best actions: {data?.summary.nextBestActions ?? '—'}</li>
          </ul>
          <section>
            <header>
              <h3>Выручка по дням</h3>
            </header>
            <Sparkline data={performanceSeries} />
          </section>
          <section>
            <header>
              <h3>Каналы продаж</h3>
            </header>
            <DataTable<ChannelBreakdown>
              columns={channelColumns}
              data={data?.channelBreakdown ?? []}
              emptyMessage="Нет данных по каналам продаж."
            />
          </section>
        </>
      )}
    </Card>
  );
};

export default AnalyticsSection;
