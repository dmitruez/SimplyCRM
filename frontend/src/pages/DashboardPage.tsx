import { useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import styles from './DashboardPage.module.css';
import { Card } from '../components/ui/Card';
import { MetricTile } from '../components/ui/MetricTile';
import { Button } from '../components/ui/Button';
import { DataTable, StatusBadge } from '../components/ui/DataTable';
import { useAuthContext } from '../providers/AuthProvider';
import { dashboardApi } from '../api/dashboard';
import {
  DashboardSalesMetrics,
  DealActivityEntry,
  DemandForecast,
  NoteEntry,
  OpportunitySummary,
  OrderSummary,
  PriceRecommendation
} from '../types/dashboard';

const formatCurrency = (amount: number, currency = 'RUB') => {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    return `${amount.toLocaleString('ru-RU')} ${currency}`.trim();
  }
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short'
  });
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const normalizeName = (firstName: string, lastName: string, fallback: string) => {
  const combined = `${firstName} ${lastName}`.trim();
  return combined.length > 0 ? combined : fallback;
};

const toneForStatus = (status: string): 'neutral' | 'success' | 'warning' => {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('paid')) {
    return 'success';
  }
  if (normalized.includes('hold') || normalized.includes('due') || normalized.includes('late') || normalized.includes('overdue')) {
    return 'warning';
  }
  return 'neutral';
};

const DashboardPage = () => {
  const { profile, isFeatureEnabled } = useAuthContext();
  const queryClient = useQueryClient();

  const analyticsEnabled = isFeatureEnabled('analytics.insights');
  const pipelineEnabled = isFeatureEnabled('sales.advanced_pipeline');
  const orderManagementEnabled = isFeatureEnabled('sales.order_management');

  const salesMetricsQuery = useQuery<DashboardSalesMetrics | null>({
    queryKey: ['dashboard', 'sales-metrics'],
    queryFn: dashboardApi.getSalesMetrics,
    enabled: analyticsEnabled,
    staleTime: 60_000
  });

  const pipelinesQuery = useQuery({
    queryKey: ['dashboard', 'pipelines'],
    queryFn: dashboardApi.listPipelines,
    enabled: pipelineEnabled,
    staleTime: 120_000
  });

  const stagesQuery = useQuery({
    queryKey: ['dashboard', 'deal-stages'],
    queryFn: dashboardApi.listDealStages,
    enabled: pipelineEnabled,
    staleTime: 120_000
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['dashboard', 'opportunities'],
    queryFn: dashboardApi.listOpportunities,
    enabled: pipelineEnabled,
    staleTime: 30_000
  });

  const activitiesQuery = useQuery({
    queryKey: ['dashboard', 'activities'],
    queryFn: dashboardApi.listDealActivities,
    enabled: pipelineEnabled,
    staleTime: 60_000
  });

  const ordersQuery = useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: dashboardApi.listOrders,
    enabled: orderManagementEnabled,
    staleTime: 60_000
  });

  const contactsQuery = useQuery({
    queryKey: ['dashboard', 'contacts'],
    queryFn: dashboardApi.listContacts,
    enabled: orderManagementEnabled,
    staleTime: 300_000
  });

  const notesQuery = useQuery({
    queryKey: ['dashboard', 'notes'],
    queryFn: dashboardApi.listNotes,
    staleTime: 60_000
  });

  const usersQuery = useQuery({
    queryKey: ['dashboard', 'users'],
    queryFn: dashboardApi.listUsers,
    staleTime: 300_000
  });

  const actionsQuery = useQuery({
    queryKey: ['dashboard', 'next-actions'],
    queryFn: dashboardApi.listNextBestActions,
    enabled: analyticsEnabled,
    staleTime: 120_000
  });

  const recommendationsQuery = useQuery({
    queryKey: ['dashboard', 'price-recommendations'],
    queryFn: dashboardApi.getPriceRecommendations,
    enabled: analyticsEnabled,
    staleTime: 300_000
  });

  const demandForecastQuery = useQuery({
    queryKey: ['dashboard', 'demand-forecast'],
    queryFn: dashboardApi.getDemandForecast,
    enabled: analyticsEnabled,
    staleTime: 300_000
  });

  const pipelines = pipelinesQuery.data ?? [];
  const stages = stagesQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const actions = actionsQuery.data ?? [];
  const priceRecommendations = recommendationsQuery.data ?? [];
  const demandForecast: DemandForecast | undefined = demandForecastQuery.data ?? undefined;
  const salesMetrics = salesMetricsQuery.data ?? null;

  const usersById = useMemo(() => {
    const entries = new Map<number, string>();
    users.forEach((user) => {
      entries.set(user.id, normalizeName(user.firstName, user.lastName, user.username || `ID ${user.id}`));
    });
    return entries;
  }, [users]);

  const contactsById = useMemo(() => {
    const entries = new Map<number, string>();
    contacts.forEach((contact) => {
      entries.set(contact.id, normalizeName(contact.firstName, contact.lastName, `ID ${contact.id}`));
    });
    return entries;
  }, [contacts]);

  const stagesByPipeline = useMemo(() => {
    const map = new Map<number, typeof stages>();
    stages.forEach((stage) => {
      const list = map.get(stage.pipelineId) ?? [];
      list.push(stage);
      map.set(stage.pipelineId, list);
    });
    map.forEach((list, key) => {
      map.set(
        key,
        [...list].sort((a, b) => a.position - b.position)
      );
    });
    return map;
  }, [stages]);

  const opportunitiesByStage = useMemo(() => {
    const map = new Map<number, OpportunitySummary[]>();
    opportunities.forEach((opportunity) => {
      const list = map.get(opportunity.stageId) ?? [];
      list.push(opportunity);
      map.set(opportunity.stageId, list);
    });
    return map;
  }, [opportunities]);

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [notes]);

  const upcomingActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const left = a.dueAt ?? a.completedAt ?? '';
        const right = b.dueAt ?? b.completedAt ?? '';
        return new Date(left).getTime() - new Date(right).getTime();
      })
      .slice(0, 8);
  }, [activities]);

  const metrics = useMemo(() => {
    const items: Array<{ title: string; value: string; delta?: string }> = [];
    if (analyticsEnabled && salesMetrics) {
      items.push({
        title: 'Выручка',
        value: formatCurrency(salesMetrics.totalRevenue),
        delta: `Средний чек ${formatCurrency(salesMetrics.averageOrderValue)}`
      });
      items.push({
        title: 'Заказы',
        value: salesMetrics.ordersCount.toLocaleString('ru-RU'),
        delta: 'Всего оформлено заказов'
      });
    }
    if (pipelineEnabled) {
      items.push({
        title: 'Активные сделки',
        value: opportunities.length.toLocaleString('ru-RU'),
        delta: 'Контроль по всем воронкам'
      });
    }
    if (orderManagementEnabled) {
      items.push({
        title: 'Покупки',
        value: orders.length.toLocaleString('ru-RU'),
        delta: 'Заказы в обработке и исполненные'
      });
    }
    items.push({
      title: 'Заметки CRM',
      value: notes.length.toLocaleString('ru-RU'),
      delta: 'Последние рабочие записи команды'
    });
    return items;
  }, [analyticsEnabled, salesMetrics, pipelineEnabled, opportunities.length, orderManagementEnabled, orders.length, notes.length]);

  const orderColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Заказ',
        render: (order: OrderSummary) => `#${order.id}`
      },
      {
        key: 'contact',
        header: 'Клиент',
        render: (order: OrderSummary) => contactsById.get(order.contactId ?? -1) ?? 'Без контакта'
      },
      {
        key: 'total',
        header: 'Сумма',
        render: (order: OrderSummary) => formatCurrency(order.totalAmount, order.currency)
      },
      {
        key: 'status',
        header: 'Статус',
        render: (order: OrderSummary) => <StatusBadge status={order.status} tone={toneForStatus(order.status)} />
      },
      {
        key: 'orderedAt',
        header: 'Создан',
        render: (order: OrderSummary) => formatDateTime(order.orderedAt)
      },
      {
        key: 'fulfilledAt',
        header: 'Исполнен',
        render: (order: OrderSummary) => formatDateTime(order.fulfilledAt)
      }
    ],
    [contactsById]
  );

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const organizationName = profile?.organization?.name ?? 'вашей команды';

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>SimplyCRM — Рабочая область</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>Панель управления SimplyCRM</h1>
          <p className={styles.subtitle}>
            Концентрат ключевых показателей и задач для {organizationName}.
          </p>
        </div>
        <Button variant="secondary" onClick={refreshDashboard}>
          Обновить данные
        </Button>
      </header>

      {metrics.length > 0 ? (
        <section>
          <div className={styles.metricsGrid}>
            {metrics.map((metric) => (
              <MetricTile key={metric.title} title={metric.title} value={metric.value} deltaLabel={metric.delta} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <Card>
          <h2>Воронка продаж</h2>
          <p className={styles.sectionDescription}>
            Мониторьте прогресс сделок по этапам и распределяйте нагрузку по менеджерам.
          </p>
          {!pipelineEnabled ? (
            <p className={styles.emptyMessage}>Функциональность расширенной воронки отключена для текущего тарифа.</p>
          ) : pipelinesQuery.isError || stagesQuery.isError || opportunitiesQuery.isError ? (
            <p className={styles.emptyMessage}>Не удалось загрузить данные по сделкам. Попробуйте обновить позже.</p>
          ) : pipelines.length === 0 ? (
            <p className={styles.emptyMessage}>Создайте первую воронку, чтобы отслеживать сделки в реальном времени.</p>
          ) : (
            <div className={styles.pipelineBoard}>
              {pipelines.map((pipeline) => {
                const pipelineStages = stagesByPipeline.get(pipeline.id) ?? [];
                const pipelineCount = pipelineStages.reduce(
                  (acc, stage) => acc + (opportunitiesByStage.get(stage.id)?.length ?? 0),
                  0
                );
                return (
                  <div key={pipeline.id} className={styles.pipelineCard}>
                    <div className={styles.pipelineHeader}>
                      <h3>{pipeline.name}</h3>
                      <span className={styles.pipelineBadge}>{pipelineCount} сделок</span>
                    </div>
                    {pipelineStages.length === 0 ? (
                      <p className={styles.emptyMessage}>Добавьте этапы, чтобы контролировать движение сделок.</p>
                    ) : (
                      <div className={styles.stageColumns}>
                        {pipelineStages.map((stage) => {
                          const stageOpportunities = [...(opportunitiesByStage.get(stage.id) ?? [])]
                            .sort((a, b) => b.amount - a.amount)
                            .slice(0, 5);
                          return (
                            <div key={stage.id} className={styles.stageColumn}>
                              <div className={styles.stageTitle}>
                                <span>{stage.name}</span>
                                <span className={styles.stageBadge}>{stageOpportunities.length}</span>
                              </div>
                              {stageOpportunities.length === 0 ? (
                                <p className={styles.stageEmpty}>Нет сделок на этапе</p>
                              ) : (
                                <ul className={styles.opportunityList}>
                                  {stageOpportunities.map((opportunity) => {
                                    const ownerName =
                                      (opportunity.ownerId && usersById.get(opportunity.ownerId)) || 'Без владельца';
                                    return (
                                      <li key={opportunity.id} className={styles.opportunityCard}>
                                        <div className={styles.opportunityMain}>
                                          <strong>{opportunity.name}</strong>
                                          <span>{formatCurrency(opportunity.amount)}</span>
                                        </div>
                                        <div className={styles.opportunityMeta}>
                                          <span>Вероятность: {Math.round(opportunity.probability)}%</span>
                                          <span>Закрытие: {formatDate(opportunity.closeDate)}</span>
                                        </div>
                                        <div className={styles.opportunityMeta}>
                                          <span>{ownerName}</span>
                                          <span>Этап: {stage.name}</span>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section className={styles.sectionGrid}>
        <Card>
          <h2>Заказы и покупки</h2>
          <p className={styles.sectionDescription}>
            Сводка последних заказов клиентов с актуальными статусами и суммами.
          </p>
          {!orderManagementEnabled ? (
            <p className={styles.emptyMessage}>Управление заказами недоступно на текущем плане.</p>
          ) : ordersQuery.isError ? (
            <p className={styles.emptyMessage}>Не удалось получить список заказов.</p>
          ) : (
            <DataTable<OrderSummary>
              columns={orderColumns}
              data={orders.slice(0, 10)}
              emptyMessage="Заказы ещё не созданы."
            />
          )}
        </Card>

        <Card>
          <h2>Следующие действия</h2>
          <p className={styles.sectionDescription}>
            Подсказки аналитики и ближайшие задачи помогут не упустить возможности.
          </p>
          {analyticsEnabled && actionsQuery.isError ? (
            <p className={styles.emptyMessage}>Не удалось загрузить рекомендации по действиям.</p>
          ) : actions.length === 0 && upcomingActivities.length === 0 ? (
            <p className={styles.emptyMessage}>Нет срочных задач. Продолжайте поддерживать темп!</p>
          ) : (
            <ul className={styles.list}>
              {actions.slice(0, 5).map((action) => (
                <li key={`nba-${action.opportunityId}-${action.summary}`} className={styles.listItem}>
                  <div className={styles.listItemTitle}>{action.summary}</div>
                  <div className={styles.listItemMeta}>{action.reason}</div>
                </li>
              ))}
              {upcomingActivities.map((activity: DealActivityEntry) => (
                <li key={`activity-${activity.id}`} className={styles.listItem}>
                  <div className={styles.listItemTitle}>{activity.subject}</div>
                  <div className={styles.listItemMeta}>
                    {activity.dueAt ? `К исполнению: ${formatDateTime(activity.dueAt)}` : 'Без срока'} —{' '}
                    {activity.ownerId ? usersById.get(activity.ownerId) ?? 'Без владельца' : 'Не назначено'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className={styles.sectionGrid}>
        <Card>
          <h2>Заметки команды</h2>
          <p className={styles.sectionDescription}>
            История последних комментариев и фиксаций контекста по сделкам.
          </p>
          {recentNotes.length === 0 ? (
            <p className={styles.emptyMessage}>Пока нет заметок. Добавьте первую, чтобы команда была в курсе.</p>
          ) : (
            <ul className={styles.list}>
              {recentNotes.map((note: NoteEntry) => (
                <li key={note.id} className={styles.listItem}>
                  <div className={styles.listItemTitle}>{note.content}</div>
                  <div className={styles.listItemMeta}>
                    {formatDateTime(note.createdAt)} —{' '}
                    {note.authorId ? usersById.get(note.authorId) ?? `ID ${note.authorId}` : 'Автоматическая запись'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2>Спрос и запасы</h2>
          <p className={styles.sectionDescription}>
            Рекомендации по ценам и прогнозы спроса помогают держать склад под контролем.
          </p>
          {!analyticsEnabled ? (
            <p className={styles.emptyMessage}>Подключите аналитический пакет, чтобы видеть прогноз спроса.</p>
          ) : recommendationsQuery.isError || demandForecastQuery.isError ? (
            <p className={styles.emptyMessage}>Не удалось загрузить аналитические рекомендации.</p>
          ) : priceRecommendations.length === 0 && (!demandForecast || (demandForecast.highDemand.length === 0 && demandForecast.lowVelocity.length === 0)) ? (
            <p className={styles.emptyMessage}>Недостаточно данных для рекомендаций. Попробуйте позже.</p>
          ) : (
            <div className={styles.inventoryGrid}>
              {priceRecommendations.slice(0, 4).map((item: PriceRecommendation) => (
                <div key={`price-${item.variantId}`} className={styles.inventoryCard}>
                  <div className={styles.listItemTitle}>{item.variantName}</div>
                  <div className={styles.listItemMeta}>{item.reason}</div>
                  <div className={styles.inventoryMeta}>
                    <span>Продажи: {item.unitsSold}</span>
                    <span>Склад: {item.stockOnHand}</span>
                    <span>Маржа: {item.margin.toFixed(1)}</span>
                  </div>
                  <span className={styles.recommendationAction}>{item.action}</span>
                </div>
              ))}
              {demandForecast && (
                <div className={styles.inventoryCard}>
                  <div className={styles.listItemTitle}>Высокий спрос</div>
                  {demandForecast.highDemand.length === 0 ? (
                    <div className={styles.stageEmpty}>Нет товаров с повышенным спросом.</div>
                  ) : (
                    <ul className={styles.inlineList}>
                      {demandForecast.highDemand.slice(0, 5).map((entry) => (
                        <li key={`high-${entry.variantId}`}>{entry.variantName} · {entry.velocity.toFixed(1)} /нед</li>
                      ))}
                    </ul>
                  )}
                  <div className={styles.listItemTitle}>Низкая оборачиваемость</div>
                  {demandForecast.lowVelocity.length === 0 ? (
                    <div className={styles.stageEmpty}>Все товары продаются стабильно.</div>
                  ) : (
                    <ul className={styles.inlineList}>
                      {demandForecast.lowVelocity.slice(0, 5).map((entry) => (
                        <li key={`low-${entry.variantId}`}>{entry.variantName} · {entry.velocity.toFixed(1)} /нед</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default DashboardPage;
