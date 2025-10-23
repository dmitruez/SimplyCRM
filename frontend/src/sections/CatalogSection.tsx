import { useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { apiClient } from '../api/apiClient';

interface CatalogStats {
  products: number;
  variants: number;
  suppliers: number;
}

const fetchCatalogStats = async (): Promise<CatalogStats> => {
  const { data } = await apiClient.get<CatalogStats>('/catalog/stats/');
  return data;
};

const CatalogSection = () => {
  const { data, isError } = useQuery({
    queryKey: ['catalog', 'stats'],
    queryFn: fetchCatalogStats,
    staleTime: 120_000,
    retry: 1
  });

  return (
    <Card>
      <h2>Каталог</h2>
      <p>Управляйте товарами, вариантами и поставщиками.</p>
      {isError ? (
        <p>Данные каталога недоступны. Проверьте соединение с API.</p>
      ) : (
        <ul>
          <li>Товаров: {data?.products ?? '—'}</li>
          <li>Вариантов: {data?.variants ?? '—'}</li>
          <li>Поставщиков: {data?.suppliers ?? '—'}</li>
        </ul>
      )}
    </Card>
  );
};

export default CatalogSection;
