import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import styles from './DashboardPage.module.css';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, StatusBadge } from '../components/ui/DataTable';
import { dashboardApi } from '../api/dashboard';
import { useAuthContext } from '../providers/AuthProvider';
import {
  DashboardOverview,
  OpportunityDigest,
  OrderDigest,
  PipelineSnapshot
} from '../types/dashboard';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
};

const formatProbability = (value: number) => {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
};

const orderTone = (status: string): 'neutral' | 'success' | 'warning' => {
  const normalized = status.toLowerCase();
  if (normalized.includes('complete') || normalized.includes('fulfilled') || normalized.includes('closed')) {
    return 'success';
  }
  if (normalized.includes('pending') || normalized.includes('process') || normalized.includes('draft')) {
    return 'warning';
  }
  return 'neutral';
};

const shipmentTone = (status: string): 'neutral' | 'success' | 'warning' => {
  const normalized = status.toLowerCase();
  if (normalized.includes('deliver')) {
    return 'success';
  }
  if (normalized.includes('ship') || normalized.includes('transit')) {
    return 'warning';
  }
  return 'neutral';
};

export const DashboardPage = () => {
  const { profile } = useAuthContext();
  const { data, isLoading, isError, isFetching, refetch } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    staleTime: 60_000
  });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: data?.summary.currency ?? 'USD',
        maximumFractionDigits: 0
      }),
    [data?.summary.currency]
  );

  const summaryCards = useMemo(() => {
    if (!data) {
      return [] as Array<{ id: string; label: string; value: string; hint?: string }>;
    }
    return [
      {
        id: 'pipeline',
        label: 'Воронка продаж',
        value: currencyFormatter.format(data.summary.pipelineTotal),
        hint: `${data.summary.openOpportunities.toLocaleString('ru-RU')} активных сделок`
      },
      {
        id: 'orders',
        label: 'Открытые заказы',
        value: data.summary.pendingOrders.toLocaleString('ru-RU'),
        hint: `На сумму ${currencyFormatter.format(data.summary.ordersTotal)}`
      },
      {
        id: 'invoices',
        label: 'Неоплаченные счета',
        value: data.summary.invoicesDue.toLocaleString('ru-RU'),
        hint:
          data.summary.overdueInvoices > 0
            ? `${data.summary.overdueInvoices.toLocaleString('ru-RU')} просрочено`
            : 'Просроченных нет'
      },
      {
        id: 'payments',
        label: 'Оплаты за месяц',
        value: currencyFormatter.format(data.summary.paymentsMonth),
        hint: 'Обновление ежедневно'
      },
      {
        id: 'catalog',
        label: 'Активные товары',
        value: data.summary.productsActive.toLocaleString('ru-RU'),
        hint: `${data.summary.inventoryOnHand.toLocaleString('ru-RU')} шт. на складе`
      },
      {
        id: 'notes',
        label: 'Заметки (7 дней)',
        value: data.summary.notesRecent.toLocaleString('ru-RU'),
        hint: `${data.summary.suppliers.toLocaleString('ru-RU')} поставщиков`
      }
    ];
  }, [currencyFormatter, data]);

  const pipelineColumns = useMemo(
    () => [
      { key: 'pipeline', header: 'Воронка' },
      { key: 'stage', header: 'Этап' },
      {
        key: 'count',
        header: 'Сделок',
        render: (row: PipelineSnapshot) => row.count.toLocaleString('ru-RU')
      },
      {
        key: 'value',
        header: 'Сумма',
        render: (row: PipelineSnapshot) => currencyFormatter.format(row.value)
      }
    ],
    [currencyFormatter]
  );

  const opportunityColumns = useMemo(
    () => [
      { key: 'name', header: 'Сделка' },
      { key: 'pipeline', header: 'Воронка' },
      { key: 'stage', header: 'Этап' },
      {
        key: 'amount',
        header: 'Сумма',
        render: (row: OpportunityDigest) => currencyFormatter.format(row.amount)
      },
      {
        key: 'closeDate',
        header: 'Закрытие',
        render: (row: OpportunityDigest) => formatDate(row.closeDate)
      },
      {
        key: 'probability',
        header: 'Вероятность',
        render: (row: OpportunityDigest) => formatProbability(row.probability)
      },
      {
        key: 'owner',
        header: 'Ответственный',
        render: (row: OpportunityDigest) => row.owner ?? '—'
      }
    ],
    [currencyFormatter]
  );

  const orderColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Заказ',
        render: (row: OrderDigest) => `#${row.id}`
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row: OrderDigest) => (
          <StatusBadge status={row.status} tone={orderTone(row.status)} />
        )
      },
      {
        key: 'contact',
        header: 'Клиент',
        render: (row: OrderDigest) => row.contact ?? '—'
      },
      {
        key: 'total',
        header: 'Сумма',
        render: (row: OrderDigest) => currencyFormatter.format(row.total)
      },
      {
        key: 'orderedAt',
        header: 'Создан',
        render: (row: OrderDigest) => formatDateTime(row.orderedAt)
      }
    ],
    [currencyFormatter]
  );

  if (isLoading) {
    return (
      <div className={styles.state}>
        <Card className={styles.sectionCard}>Загружаем CRM-дашборд…</Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.state}>
        <Card className={styles.sectionCard}>
          <p>Не удалось загрузить данные CRM.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Повторить попытку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Рабочая область CRM — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Рабочий стол CRM</h1>
          <p>
            {profile?.organization?.name
              ? `Организация: ${profile.organization.name}`
              : 'Сводка продаж, финанс и операций за последние обновления.'}
          </p>
        </div>
        <Button
          className={styles.refreshButton}
          variant="secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Обновляем…' : 'Обновить данные'}
        </Button>
      </header>

      <section className={styles.summaryGrid}>
        {summaryCards.map((metric) => (
          <Card key={metric.id} className={styles.metricCard}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            {metric.hint ? <span className={styles.metricHint}>{metric.hint}</span> : null}
          </Card>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.column}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Воронка продаж</h2>
              <span className={styles.sectionMeta}>
                {currencyFormatter.format(data.summary.pipelineTotal)} в работе
              </span>
            </div>
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Структура этапов</h3>
              <DataTable<PipelineSnapshot>
                columns={pipelineColumns}
                data={data.pipeline}
                emptyMessage="Нет активных сделок"
              />
            </div>
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Недавние возможности</h3>
              <DataTable<OpportunityDigest>
                columns={opportunityColumns}
                data={data.recentOpportunities}
                emptyMessage="Недавние сделки отсутствуют"
              />
            </div>
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Ближайшие активности</h2>
              <span className={styles.sectionMeta}>
                {data.upcomingActivities.length
                  ? `${data.upcomingActivities.length} задач`
                  : 'Нет задач'}
              </span>
            </div>
            {data.upcomingActivities.length === 0 ? (
              <div className={styles.emptyState}>Нет запланированных активностей.</div>
            ) : (
              <ul className={styles.list}>
                {data.upcomingActivities.map((activity) => (
                  <li key={activity.id} className={styles.listItem}>
                    <div className={styles.listPrimary}>
                      <strong>{activity.subject || activity.type}</strong>
                      {activity.opportunity ? (
                        <span className={styles.listTag}>{activity.opportunity.name}</span>
                      ) : null}
                    </div>
                    <div className={styles.listSecondary}>
                      <span>{activity.owner ?? 'Не назначено'}</span>
                      <span>{formatDateTime(activity.dueAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Недавние заметки</h2>
              <span className={styles.sectionMeta}>
                {data.recentNotes.length ? `${data.recentNotes.length} записей` : 'Нет заметок'}
              </span>
            </div>
            {data.recentNotes.length === 0 ? (
              <div className={styles.emptyState}>Заметки еще не добавлены.</div>
            ) : (
              <ul className={styles.notesList}>
                {data.recentNotes.map((note) => (
                  <li key={note.id} className={styles.noteItem}>
                    <div className={styles.noteHeader}>
                      <strong>{note.author ?? 'Без автора'}</strong>
                      <span className={styles.noteMeta}>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className={styles.noteContent}>{note.content}</p>
                    <span className={styles.noteMeta}>
                      Объект: {note.relatedObject.type} #{note.relatedObject.id}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className={styles.column}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Заказы</h2>
              <span className={styles.sectionMeta}>
                {data.summary.pendingOrders.toLocaleString('ru-RU')} открыто •{' '}
                {currencyFormatter.format(data.summary.ordersTotal)}
              </span>
            </div>
            <DataTable<OrderDigest>
              columns={orderColumns}
              data={data.recentOrders}
              emptyMessage="Заказы не найдены"
            />
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Финансы</h2>
              <span className={styles.sectionMeta}>Счета и поступления</span>
            </div>
            <div className={styles.splitGrid}>
              <div>
                <h3 className={styles.tableTitle}>Счета</h3>
                {data.recentInvoices.length === 0 ? (
                  <div className={styles.emptyState}>Счета отсутствуют.</div>
                ) : (
                  <ul className={styles.list}>
                    {data.recentInvoices.map((invoice) => (
                      <li key={invoice.id} className={styles.listItem}>
                        <div className={styles.listPrimary}>
                          <strong>#{invoice.id}</strong>
                          <span className={styles.listTag}>{invoice.status}</span>
                        </div>
                        <div className={styles.listSecondary}>
                          <span>{currencyFormatter.format(invoice.total)}</span>
                          <span>{formatDate(invoice.dueDate)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className={styles.tableTitle}>Платежи</h3>
                {data.recentPayments.length === 0 ? (
                  <div className={styles.emptyState}>Поступлений пока не было.</div>
                ) : (
                  <ul className={styles.list}>
                    {data.recentPayments.map((payment) => (
                      <li key={payment.id} className={styles.listItem}>
                        <div className={styles.listPrimary}>
                          <strong>{payment.provider}</strong>
                          <span className={styles.listTag}>Счет #{payment.invoiceId}</span>
                        </div>
                        <div className={styles.listSecondary}>
                          <span>{currencyFormatter.format(payment.amount)}</span>
                          <span>{formatDateTime(payment.processedAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Логистика и каталог</h2>
              <span className={styles.sectionMeta}>Статусы отправлений и запасов</span>
            </div>
            {data.recentShipments.length === 0 ? (
              <div className={styles.emptyState}>Отправлений пока нет.</div>
            ) : (
              <ul className={styles.list}>
                {data.recentShipments.map((shipment) => (
                  <li key={shipment.id} className={styles.listItem}>
                    <div className={styles.listPrimary}>
                      <strong>#{shipment.id}</strong>
                      <StatusBadge
                        status={shipment.status}
                        tone={shipmentTone(shipment.status)}
                      />
                    </div>
                    <div className={styles.listSecondary}>
                      <span>{shipment.carrier}</span>
                      <span>{formatDateTime(shipment.shippedAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.catalogStats}>
              <div>
                <span className={styles.metricLabel}>Поставщики</span>
                <span className={styles.metricValueSmall}>
                  {data.summary.suppliers.toLocaleString('ru-RU')}
                </span>
              </div>
              <div>
                <span className={styles.metricLabel}>Варианты товаров</span>
                <span className={styles.metricValueSmall}>
                  {data.summary.productVariants.toLocaleString('ru-RU')}
                </span>
              </div>
              <div>
                <span className={styles.metricLabel}>Запасы на складе</span>
                <span className={styles.metricValueSmall}>
                  {data.summary.inventoryOnHand.toLocaleString('ru-RU')} шт.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
