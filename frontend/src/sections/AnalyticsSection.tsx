import { useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { apiClient } from '../api/apiClient';

interface InsightPayload {
  rfmSegments: number;
  demandAlerts: number;
  priceRecommendations: number;
}

const fetchInsights = async (): Promise<InsightPayload> => {
  const { data } = await apiClient.get<InsightPayload>('/insight-analytics/summary/');
  return data;
};

const AnalyticsSection = () => {
  const { data, isError } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchInsights,
    staleTime: 180_000,
    retry: 1
  });

  return (
    <Card>
      <h2>Аналитика</h2>
      <p>Глубокие отчеты, RFM, прогнозы спроса и next-best-actions.</p>
      {isError ? (
        <p>Аналитика временно недоступна. Проверьте инсайт-эндпоинты.</p>
      ) : (
        <ul>
          <li>RFM сегменты: {data?.rfmSegments ?? '—'}</li>
          <li>Аномалии и алерты: {data?.demandAlerts ?? '—'}</li>
          <li>Рекомендации цен: {data?.priceRecommendations ?? '—'}</li>
        </ul>
      )}
    </Card>
  );
};

export default AnalyticsSection;
