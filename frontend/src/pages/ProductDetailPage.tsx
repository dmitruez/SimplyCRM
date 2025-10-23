import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import styles from './ProductDetailPage.module.css';
import { catalogApi } from '../api/catalog';
import { salesApi } from '../api/sales';
import { Deal, DealNote } from '../types/sales';
import { DataTable, StatusBadge } from '../components/ui/DataTable';

export const ProductDetailPage = () => {
  const params = useParams();
  const productId = Number.parseInt(params.productId ?? '', 10);

  const {
    data: product,
    isError,
    isLoading
  } = useQuery({
    queryKey: ['catalog', 'product', productId],
    queryFn: () => catalogApi.getProduct(productId),
    enabled: Number.isFinite(productId)
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['sales', 'deals', 'product', productId],
    queryFn: () => salesApi.listDeals({ productId }),
    enabled: Number.isFinite(productId)
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['sales', 'notes', 'all'],
    queryFn: () => salesApi.listNotes()
  });

  const relatedNotes = useMemo(() => {
    if (!deals.length) return [] as DealNote[];
    const dealIds = new Set(deals.map((deal) => deal.id));
    return notes.filter((note) => (note.relatedDealId ? dealIds.has(note.relatedDealId) : false));
  }, [deals, notes]);

  const dealColumns = useMemo(
    () => [
      { key: 'title', header: 'Сделка' },
      {
        key: 'stage',
        header: 'Этап',
        render: (deal: Deal) => <StatusBadge status={deal.stage} />
      },
      {
        key: 'value',
        header: 'Сумма',
        render: (deal: Deal) => `${deal.value.toLocaleString('ru-RU')} ${deal.currency}`
      },
      {
        key: 'owner',
        header: 'Ответственный'
      },
      {
        key: 'expectedCloseDate',
        header: 'Закрытие',
        render: (deal: Deal) => new Date(deal.expectedCloseDate).toLocaleDateString()
      }
    ],
    []
  );

  if (!Number.isFinite(productId)) {
    return <p>Неверный идентификатор товара.</p>;
  }

  if (isLoading) {
    return <p>Загрузка информации о товаре…</p>;
  }

  if (isError || !product) {
    return <p>Не удалось загрузить товар. Попробуйте обновить страницу.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>{product.name} — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>{product.name}</h1>
          <p>{product.description ?? 'Описание не заполнено.'}</p>
        </div>
        <div className={styles.meta}>
          <span>SKU: {product.sku}</span>
          <span>Категория: {product.category ?? '—'}</span>
          <span>
            Цена: {product.price.toLocaleString('ru-RU')} {product.currency}
          </span>
          <span>Остаток: {product.stock} шт.</span>
          <span>Поставщик: {product.supplierName ?? '—'}</span>
          <span>Обновлено: {new Date(product.updatedAt).toLocaleString()}</span>
        </div>
      </header>
      <section className={styles.section}>
        <h2>Связанные сделки</h2>
        <DataTable<Deal>
          columns={dealColumns}
          data={deals}
          emptyMessage="Связанные сделки не найдены."
        />
      </section>
      <section className={styles.section}>
        <h2>Заметки</h2>
        {relatedNotes.length === 0 ? (
          <p>Нет заметок, связанных с этим товаром.</p>
        ) : (
          <div className={styles.notesList}>
            {relatedNotes.map((note) => (
              <div key={note.id} className={styles.note}>
                <strong>{note.author}</strong>
                <p>{note.body}</p>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
