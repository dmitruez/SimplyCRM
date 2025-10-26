import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';

import {Card} from '../components/ui/Card';
import {DataTable} from '../components/ui/DataTable';
import {apiClient} from '../api/apiClient';
import {catalogApi} from '../api/catalog';
import {Product} from '../types/catalog';

interface CatalogStats {
    products: number;
    variants: number;
    suppliers: number;
}

const fetchCatalogStats = async (): Promise<CatalogStats> => {
    const {data} = await apiClient.get<CatalogStats>('/catalog/stats/');
    return data;
};

const CatalogSection = () => {
    const {data, isError} = useQuery({
        queryKey: ['catalog', 'stats'],
        queryFn: fetchCatalogStats,
        staleTime: 120_000,
        retry: 1
    });

  const { data: topProducts = [], isError: isProductsError } = useQuery({
    queryKey: ['catalog', 'products', 'top'],
    queryFn: async () => {
      const response = await catalogApi.listProducts({ pageSize: 5, ordering: '-id' });
      return response.results;
    },
    staleTime: 90_000,
    retry: 1
  });

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Товар' },
      { key: 'sku', header: 'SKU' },
      {
        key: 'categoryName',
        header: 'Категория',
        render: (product: Product) => product.categoryName ?? '—'
      },
      {
        key: 'variants',
        header: 'Варианты',
        render: (product: Product) => product.variants.length
      },
      {
        key: 'isActive',
        header: 'Статус',
        render: (product: Product) => (product.isActive ? 'Активен' : 'Отключён')
      }
    ],
    []
  );

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
            <header>
                <h3>Последние обновления каталога</h3>
            </header>
            {isProductsError ? (
                <p>Не удалось получить список товаров.</p>
            ) : (
                <DataTable<Product>
                    columns={columns}
                    data={topProducts}
                    emptyMessage="Товары еще не добавлены."
                />
            )}
            <div style={{marginTop: '1.5rem'}}>
                <Link to="/products">Перейти в каталог →</Link>
            </div>
        </Card>
    );
};

export default CatalogSection;
