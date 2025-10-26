import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import styles from './ProductsPage.module.css';
import { DataTable } from '../components/ui/DataTable';
import { catalogApi } from '../api/catalog';
import { Product, ProductFilters, ProductListResponse } from '../types/catalog';
import { Button } from '../components/ui/Button';
import { notificationBus } from '../components/notifications/notificationBus';

const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  pageSize: 25
};

export const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    image: null as File | null
  });

  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery<ProductListResponse>({
    queryKey: ['catalog', 'products', 'list', filters],
    queryFn: () => catalogApi.listProducts(filters),
    placeholderData: (previousData) => previousData
  });

  const products = data?.results ?? [];

  const createProductMutation = useMutation({
    mutationFn: catalogApi.createProduct,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Товар добавлен',
        message: 'Новый товар появился в каталоге.'
      });
      setNewProduct({ name: '', sku: '', description: '', image: null });
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'products', 'list'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка при добавлении товара',
        message: 'Проверьте данные и попробуйте снова.'
      });
    }
  });

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
        render: (product: Product) => product.categoryName ?? '—'
      },
      {
        key: 'variants',
        header: 'Варианты',
        render: (product: Product) =>
          product.variants.length > 0
            ? `${product.variants.length} шт. / от ${product.variants[0].price.toLocaleString('ru-RU')} ₽`
            : '—'
      },
      {
        key: 'isActive',
        header: 'Статус',
        render: (product: Product) => (product.isActive ? 'Активен' : 'Отключён')
      }
    ],
    []
  );

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const nextFilters: ProductFilters = {
      ...DEFAULT_FILTERS,
      search: search || undefined
    };
    setFilters(nextFilters);
  };

  const resetFilters = () => {
    setSearch('');
    setFilters({ ...DEFAULT_FILTERS });
  };

  const handleNewProductChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setNewProduct((prev) => ({ ...prev, image: file }));
  };

  const handleCreateProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!newProduct.name || !newProduct.sku) {
      notificationBus.publish({
        type: 'warning',
        title: 'Заполните обязательные поля',
        message: 'Название и SKU товара обязательны.'
      });
      return;
    }
    createProductMutation.mutate({
      name: newProduct.name,
      sku: newProduct.sku,
      description: newProduct.description,
      image: newProduct.image
    });
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

      <section className={styles.createCard}>
        <h2>Добавить товар</h2>
        <form className={styles.createForm} onSubmit={handleCreateProduct}>
          <label>
            Название
            <input
              name="name"
              value={newProduct.name}
              onChange={handleNewProductChange}
              required
            />
          </label>
          <label>
            SKU
            <input
              name="sku"
              value={newProduct.sku}
              onChange={handleNewProductChange}
              required
            />
          </label>
          <label className={styles.fullWidth}>
            Описание
            <textarea
              name="description"
              value={newProduct.description}
              onChange={handleNewProductChange}
              rows={3}
            />
          </label>
          <label className={styles.fullWidth}>
            Главное изображение
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          <div className={styles.formActions}>
            <Button type="submit" disabled={createProductMutation.isPending}>
              Добавить товар
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};
