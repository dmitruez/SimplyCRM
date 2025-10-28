import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import styles from './ProductsPage.module.css';
import { catalogApi } from '../api/catalog';
import { ProductFilters, ProductListResponse } from '../types/catalog';
import { Button } from '../components/ui/Button';
import { notificationBus } from '../components/notifications/notificationBus';

const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  pageSize: 25
};

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value ?? 0);

export const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    image: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

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
      setImagePreview(null);
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
    const inputElement = event.target;
    const file = inputElement.files?.[0] ?? null;

    if (!file) {
      setNewProduct((prev) => ({ ...prev, image: null }));
      setImagePreview(null);
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      notificationBus.publish({
        type: 'error',
        title: 'Неподдерживаемый формат',
        message: 'Загрузите изображение в формате JPEG, PNG или WebP.'
      });
      inputElement.value = '';
      setNewProduct((prev) => ({ ...prev, image: null }));
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (image.width > 500 || image.height > 500) {
          notificationBus.publish({
            type: 'error',
            title: 'Изображение слишком большое',
            message: 'Размер изображения не должен превышать 500x500 пикселей.'
          });
          inputElement.value = '';
          setNewProduct((prev) => ({ ...prev, image: null }));
          setImagePreview(null);
          return;
        }
        setNewProduct((prev) => ({ ...prev, image: file }));
        setImagePreview(reader.result as string);
      };
      image.onerror = () => {
        notificationBus.publish({
          type: 'error',
          title: 'Ошибка загрузки',
          message: 'Не удалось прочитать изображение. Попробуйте другой файл.'
        });
        inputElement.value = '';
        setNewProduct((prev) => ({ ...prev, image: null }));
        setImagePreview(null);
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!newProduct.name) {
      notificationBus.publish({
        type: 'warning',
        title: 'Заполните обязательные поля',
        message: 'Название товара обязательно.'
      });
      return;
    }
    createProductMutation.mutate({
      name: newProduct.name,
      sku: newProduct.sku?.trim() || undefined,
      description: newProduct.description,
      image: newProduct.image
    });
  };

  const inventoryStats = useMemo(() => {
    const totalVariants = products.reduce((acc, product) => acc + product.variants.length, 0);
    const activeProducts = products.filter((product) => product.isActive).length;
    const inactiveProducts = products.length - activeProducts;
    return { totalVariants, activeProducts, inactiveProducts };
  }, [products]);

  const paginatedInfo = useMemo(() => {
    if (!data) {
      return '';
    }
    const start = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 25) + 1;
    const end = Math.min(start + (filters.pageSize ?? 25) - 1, data.count);
    return `${start}–${end} из ${data.count}`;
  }, [data, filters.page, filters.pageSize]);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Каталог продуктов — SimplyCRM</title>
      </Helmet>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarBadge}>Каталог</span>
            <h1>Товары и варианты</h1>
            <p>Ищите товары, контролируйте остатки и обновляйте карточки в едином интерфейсе.</p>
          </div>
          <form className={styles.filterForm} onSubmit={applyFilters}>
            <label className={styles.formField}>
              <span>Поиск по названию или SKU</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Введите запрос"
              />
            </label>
            <div className={styles.filterActions}>
              <Button type="submit" disabled={isFetching}>
                Применить
              </Button>
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Сбросить
              </Button>
            </div>
          </form>
          <div className={styles.sidebarStats}>
            <div>
              <span>Активных товаров</span>
              <strong>{inventoryStats.activeProducts}</strong>
            </div>
            <div>
              <span>Неактивных</span>
              <strong>{inventoryStats.inactiveProducts}</strong>
            </div>
            <div>
              <span>Всего вариантов</span>
              <strong>{inventoryStats.totalVariants}</strong>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <section className={styles.hero}>
            <div>
              <h2>Каталог SimplyCRM</h2>
              <p>Современная витрина с фильтрами и быстрым доступом к товарам и их вариантам.</p>
            </div>
            <div className={styles.heroStats}>
              <div>
                <span>Записей на странице</span>
                <strong>{filters.pageSize}</strong>
              </div>
              <div>
                <span>Выбрано</span>
                <strong>{paginatedInfo || '—'}</strong>
              </div>
            </div>
          </section>

          <section className={styles.listSection}>
            <header className={styles.sectionHeader}>
              <div>
                <h3>Список товаров</h3>
                <span>Проверьте описание, варианты и статус активности.</span>
              </div>
            </header>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU</th>
                    <th>Категория</th>
                    <th>Варианты</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const firstVariant = product.variants[0];
                    return (
                      <tr key={product.id}>
                        <td>
                          <span className={styles.productName}>{product.name}</span>
                          {product.description && <p>{product.description}</p>}
                        </td>
                        <td>{product.sku || '—'}</td>
                        <td>{product.categoryName ?? '—'}</td>
                        <td>
                          {product.variants.length > 0
                            ? `${product.variants.length} / ${formatCurrency(firstVariant.price)}`
                            : '—'}
                        </td>
                        <td>
                          <span className={product.isActive ? styles.statusActive : styles.statusInactive}>
                            {product.isActive ? 'Активен' : 'Отключён'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        Товары не найдены. Измените фильтр или добавьте новый товар.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className={styles.secondary}>
          <div className={styles.createPanel}>
            <h3>Добавить товар</h3>
            <p>Создайте новую карточку, чтобы затем добавить варианты и стоимость.</p>
            <form className={styles.formGrid} onSubmit={handleCreateProduct}>
              <label className={styles.formField}>
                <span>Название *</span>
                <input name="name" value={newProduct.name} onChange={handleNewProductChange} required />
              </label>
              <label className={styles.formField}>
                <span>SKU</span>
                <input name="sku" value={newProduct.sku} onChange={handleNewProductChange} />
              </label>
              <label className={styles.formField}>
                <span>Описание</span>
                <textarea name="description" value={newProduct.description} onChange={handleNewProductChange} rows={3} />
              </label>
              <label className={styles.formField}>
                <span>Изображение</span>
                <input type="file" accept={allowedImageTypes.join(',')} onChange={handleImageChange} />
                {imagePreview && <img src={imagePreview} alt="Предпросмотр" className={styles.previewImage} />}
              </label>
              <div className={styles.formActions}>
                <Button type="submit" disabled={createProductMutation.isPending}>
                  Создать товар
                </Button>
              </div>
            </form>
          </div>
          <div className={styles.secondaryPanel}>
            <h3>Советы по каталогу</h3>
            <ul>
              <li>Используйте говорящие названия и уникальные SKU.</li>
              <li>Добавьте описание, чтобы менеджеры быстрее ориентировались.</li>
              <li>Следите за активностью товаров и архивируйте устаревшие позиции.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
