import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { DataTable, StatusBadge } from '../components/ui/DataTable';
import { apiClient } from '../api/apiClient';
import { salesApi } from '../api/sales';
import { Deal, DealNote, PurchaseRecord } from '../types/sales';

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

  const { data: deals = [] } = useQuery({
    queryKey: ['sales', 'deals', 'overview'],
    queryFn: () => salesApi.listDeals({ ordering: '-close_date' }),
    staleTime: 30_000
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['sales', 'purchases'],
    queryFn: () => salesApi.listPurchases(),
    staleTime: 45_000
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['sales', 'notes'],
    queryFn: () => salesApi.listNotes(),
    staleTime: 60_000
  });

  const dealColumns = useMemo(
    () => [
      { key: 'name', header: 'Сделка' },
      {
        key: 'stageName',
        header: 'Этап',
        render: (deal: Deal) => <StatusBadge status={deal.stageName} />
      },
      {
        key: 'ownerName',
        header: 'Ответственный',
        render: (deal: Deal) => deal.ownerName ?? '—'
      },
      {
        key: 'amount',
        header: 'Сумма',
        render: (deal: Deal) => `${deal.amount.toLocaleString('ru-RU')} USD`
      },
      {
        key: 'closeDate',
        header: 'Закрытие',
        render: (deal: Deal) => (deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '—')
      },
      {
        key: 'probability',
        header: 'Вероятность',
        render: (deal: Deal) => `${Math.round(deal.probability <= 1 ? deal.probability * 100 : deal.probability)}%`
      }
    ],
    []
  );

  const purchaseColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Заказ',
        render: (purchase: PurchaseRecord) => `#${purchase.id}`
      },
      {
        key: 'contactName',
        header: 'Клиент',
        render: (purchase: PurchaseRecord) => purchase.contactName ?? '—'
      },
      {
        key: 'totalAmount',
        header: 'Итого',
        render: (purchase: PurchaseRecord) =>
          `${purchase.totalAmount.toLocaleString('ru-RU')} ${purchase.currency}`
      },
      {
        key: 'status',
        header: 'Статус',
        render: (purchase: PurchaseRecord) => {
          const normalized = purchase.status.toLowerCase();
          let tone: 'neutral' | 'success' | 'warning' = 'neutral';
          if (normalized.includes('complete') || normalized.includes('fulfill') || normalized.includes('paid')) {
            tone = 'success';
          } else if (normalized.includes('pending') || normalized.includes('draft')) {
            tone = 'warning';
          }
          return <StatusBadge status={purchase.status} tone={tone} />;
        }
      },
      {
        key: 'orderedAt',
        header: 'Создан',
        render: (purchase: PurchaseRecord) =>
          purchase.orderedAt ? new Date(purchase.orderedAt).toLocaleString() : '—'
      }
    ],
    []
  );

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
      <section>
        <header>
          <h3>Активные сделки</h3>
        </header>
        <DataTable<Deal>
          columns={dealColumns}
          data={deals}
          emptyMessage="Нет активных сделок."
        />
      </section>
      <section>
        <header>
          <h3>История покупок</h3>
        </header>
        <DataTable<PurchaseRecord>
          columns={purchaseColumns}
          data={purchases}
          emptyMessage="История покупок пока пуста."
        />
      </section>
      <section>
        <header>
          <h3>Заметки по сделкам</h3>
        </header>
        {notes.length === 0 ? (
          <p>Заметки пока отсутствуют.</p>
        ) : (
          <ul>
            {notes.map((note: DealNote) => (
              <li key={note.id}>
                <strong>{note.authorName ?? 'Без автора'}</strong> — {note.content}{' '}
                <span style={{ color: 'rgba(17,24,39,0.6)' }}>
                  {new Date(note.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
};

export default SalesSection;
