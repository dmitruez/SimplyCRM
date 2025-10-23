import { useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { apiClient } from '../api/apiClient';

interface SalesStats {
  openDeals: number;
  wonDeals: number;
  revenue: number;
}

const fetchSalesStats = async (): Promise<SalesStats> => {
  const { data } = await apiClient.get<SalesStats>('/sales/stats/');
  return data;
};

const SalesSection = () => {
  const { data, isError } = useQuery({
    queryKey: ['sales', 'stats'],
    queryFn: fetchSalesStats,
    staleTime: 60_000,
    retry: 1
  });

  return (
    <Card>
      <h2>Продажи</h2>
      <p>Следите за конверсией, скоростью сделок и выручкой.</p>
      {isError ? (
        <p>Не удалось получить статистику продаж. Проверьте API.</p>
      ) : (
        <ul>
          <li>Открытые сделки: {data?.openDeals ?? '—'}</li>
          <li>Выигранные сделки: {data?.wonDeals ?? '—'}</li>
          <li>Выручка: ₽{data?.revenue?.toLocaleString('ru-RU') ?? '—'}</li>
        </ul>
      )}
    </Card>
  );
};

export default SalesSection;
