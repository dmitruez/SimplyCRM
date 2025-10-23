import { FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import styles from './ProductsPage.module.css';
import { DataTable } from '../components/ui/DataTable';
import { catalogApi } from '../api/catalog';
import { Product, ProductFilters, Supplier } from '../types/catalog';

const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  pageSize: 25
};

export const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['catalog', 'suppliers'],
    queryFn: catalogApi.listSuppliers,
    staleTime: 300_000
  });

  const { data, isFetching } = useQuery({
    queryKey: ['catalog', 'products', 'list', filters],
    queryFn: () => catalogApi.listProducts(filters),
    keepPreviousData: true
  });

  const products = data?.results ?? [];

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Товар',
        render: (product: Product) => (
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        )
      },
      { key: 'sku', header: 'SKU' },
      {
        key: 'category',
        header: 'Категория',
        render: (product: Product) => product.category ?? '—'
      },
      {
        key: 'price',
        header: 'Цена',
        render: (product: Product) => `${product.price.toLocaleString('ru-RU')} ${product.currency}`
      },
      {
        key: 'stock',
        header: 'Остаток',
        render: (product: Product) => `${product.stock} шт.`
      },
      {
        key: 'supplierName',
        header: 'Поставщик',
        render: (product: Product) => product.supplierName ?? '—'
      },
      {
        key: 'updatedAt',
        header: 'Обновлено',
        render: (product: Product) => new Date(product.updatedAt).toLocaleDateString()
      }
    ],
    []
  );

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const nextFilters: ProductFilters = {
      ...DEFAULT_FILTERS,
      search: search || undefined,
      category: category || undefined,
      supplierId: supplierId ? Number.parseInt(supplierId, 10) : undefined,
      minStock: minStock ? Number.parseInt(minStock, 10) : undefined
    };
    setFilters(nextFilters);
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setSupplierId('');
    setMinStock('');
    setFilters({ ...DEFAULT_FILTERS });
  };

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Каталог продуктов — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>Каталог продуктов</h1>
          <p>Просматривайте и фильтруйте товары, управляйте остатками и поставщиками.</p>
        </div>
        <form className={styles.filters} onSubmit={applyFilters}>
          <label>
            Поиск
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название или SKU"
            />
          </label>
          <label>
            Категория
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Например, Электроника"
            />
          </label>
          <label>
            Поставщик
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Все</option>
              {suppliers.map((supplier: Supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Мин. остаток
            <input
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              type="number"
              min={0}
            />
          </label>
          <button type="submit">Применить</button>
          <button type="button" onClick={resetFilters} style={{ background: 'rgba(17, 24, 39, 0.08)', color: 'var(--color-primary-dark)' }}>
            Сбросить
          </button>
        </form>
        <div className={styles.summary}>
          <span>Всего товаров: {data?.count ?? '—'}</span>
          {isFetching ? <span>Обновление данных…</span> : null}
        </div>
      </header>
      <DataTable<Product>
        columns={columns}
        data={products}
        emptyMessage="Каталог пока пуст. Добавьте товары через CRM."
      />
    </div>
  );
};
