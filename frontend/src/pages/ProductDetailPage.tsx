import {useMemo} from 'react';
import {useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Helmet} from 'react-helmet-async';

import styles from './ProductDetailPage.module.css';
import {catalogApi} from '../api/catalog';
import {salesApi} from '../api/sales';
import {Deal} from '../types/sales';
import {DataTable, StatusBadge} from '../components/ui/DataTable';

const formatProbability = (value: number) => {
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
};

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

    const {data: deals = []} = useQuery({
        queryKey: ['sales', 'deals', 'recent'],
        queryFn: () => salesApi.listDeals({ordering: '-close_date'})
    });

    const {data: notes = []} = useQuery({
        queryKey: ['sales', 'notes', 'all'],
        queryFn: () => salesApi.listNotes()
    });

    const amountFormatter = useMemo(
        () =>
            new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'USD'
            }),
        []
    );

    const relatedNotes = useMemo(() => {
        return notes.filter(
            (note) =>
                note.relatedObjectType.toLowerCase() === 'product' &&
                note.relatedObjectId === productId
        );
    }, [notes, productId]);

    const dealColumns = useMemo(
        () => [
            {key: 'name', header: 'Сделка'},
            {key: 'pipelineName', header: 'Воронка'},
            {
                key: 'stageName',
                header: 'Этап',
                render: (deal: Deal) => <StatusBadge status={deal.stageName}/>
            },
            {
                key: 'amount',
                header: 'Сумма',
                render: (deal: Deal) => amountFormatter.format(deal.amount)
            },
            {
                key: 'ownerName',
                header: 'Ответственный'
            },
            {
                key: 'closeDate',
                header: 'Закрытие',
                render: (deal: Deal) => (deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '—')
            },
            {
                key: 'probability',
                header: 'Вероятность',
                render: (deal: Deal) => formatProbability(deal.probability)
            }
        ],
        [amountFormatter]
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

  const primaryVariant = product.variants[0];
  const priceLabel = primaryVariant ? `${primaryVariant.price.toLocaleString('ru-RU')} ₽` : '—';

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
          <span>Категория: {product.categoryName ?? '—'}</span>
          <span>Вариантов: {product.variants.length}</span>
          <span>Цена от: {priceLabel}</span>
          <span>Статус: {product.isActive ? 'Активен' : 'Отключён'}</span>
        </div>
        {product.mainImageUrl ? (
          <img src={product.mainImageUrl} alt={product.name} className={styles.preview} />
        ) : null}
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
                <strong>{note.authorName ?? 'Без автора'}</strong>
                <p>{note.content}</p>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
