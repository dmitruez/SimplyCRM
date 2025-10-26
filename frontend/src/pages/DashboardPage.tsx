import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import styles from './DashboardPage.module.css';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, StatusBadge } from '../components/ui/DataTable';
import { dashboardApi } from '../api/dashboard';
import { salesApi } from '../api/sales';
import { analyticsApi } from '../api/analytics';
import { automationApi } from '../api/automation';
import { integrationsApi } from '../api/integrations';
import { assistantApi } from '../api/assistant';
import { useAuthContext } from '../providers/AuthProvider';
import { notificationBus } from '../components/notifications/notificationBus';
import {
  DashboardOverview,
  OpportunityDigest,
  OrderDigest,
  PipelineSnapshot
} from '../types/dashboard';
import {
  DealNote,
  PurchaseRecord,
  InvoiceRecord,
  PaymentRecord,
  ShipmentRecord
} from '../types/sales';
import {
  AnalyticsInsight,
  DemandForecast,
  NextBestAction,
  PriceRecommendationResult,
  RfmScore,
  SalesMetricTotals
} from '../types/analytics';
import {
  AutomationRule,
  Campaign,
  NotificationRecord,
  WebhookEventRecord
} from '../types/automation';
import {
  ApiKeyRecord,
  IntegrationConnectionRecord,
  IntegrationLogRecord,
  ImportJobRecord,
  WebhookSubscriptionRecord
} from '../types/integrations';
import { AssistantConversation } from '../types/assistant';

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

const featurePlanMap: Record<string, string> = {
  'billing.invoices': 'Pro',
  'billing.payments': 'Pro',
  'logistics.shipments': 'Pro',
  'analytics.standard': 'Pro',
  'analytics.forecasting': 'Pro',
  'analytics.customer_segments': 'Pro',
  'analytics.insights': 'Enterprise',
  'automation.core': 'Enterprise',
  'automation.rules': 'Enterprise',
  'automation.campaigns': 'Enterprise',
  'automation.notifications': 'Enterprise',
  'automation.webhooks': 'Enterprise',
  'integrations.core': 'Enterprise',
  'integrations.api_keys': 'Enterprise',
  'integrations.webhooks': 'Enterprise',
  'integrations.connectors': 'Enterprise',
  'integrations.imports': 'Enterprise'
};

const generateApiKey = () => `sim_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

export const DashboardPage = () => {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const [noteRelated, setNoteRelated] = useState('');
  const [ruleDraft, setRuleDraft] = useState({
    name: '',
    trigger: '',
    description: '',
    conditions: '{"status": "open"}',
    actions: '[{"type":"notify_owner"}]'
  });
  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    description: '',
    status: 'draft',
    audience: '{"segment": "vip"}'
  });
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyScopes, setApiKeyScopes] = useState('catalog.read,sales.pipeline');
  const [connectionDraft, setConnectionDraft] = useState({
    provider: '',
    config: '{"endpoint": "https://example.com"}'
  });
  const [importJobSource, setImportJobSource] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationPrompt, setConversationPrompt] = useState('Вы консультант по продажам SimplyCRM.');
  const [messageInput, setMessageInput] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const featureSet = useMemo(
    () =>
      new Set(
        (profile?.featureFlags ?? [])
          .filter((flag) => flag.enabled)
          .map((flag) => flag.code)
      ),
    [profile?.featureFlags]
  );

  const hasFeature = useCallback((code: string) => featureSet.has(code), [featureSet]);

  const parseJsonInput = useCallback(
    <T,>(value: string, fallback: T, label: string): T | null => {
      if (!value.trim()) {
        return fallback;
      }
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        notificationBus.publish({
          type: 'error',
          title: 'Некорректный JSON',
          message: `Исправьте поле "${label}". Ошибка парсинга.`
        });
        return null;
      }
    },
    []
  );

  const { data, isLoading, isError, isFetching, refetch } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    staleTime: 60_000
  });

  const purchasesQuery = useQuery<PurchaseRecord[]>({
    queryKey: ['sales', 'orders'],
    queryFn: salesApi.listPurchases,
    enabled: hasFeature('sales.order_management')
  });

  const notesQuery = useQuery<DealNote[]>({
    queryKey: ['sales', 'notes'],
    queryFn: salesApi.listNotes
  });

  const invoicesQuery = useQuery<InvoiceRecord[]>({
    queryKey: ['sales', 'invoices'],
    queryFn: salesApi.listInvoices,
    enabled: hasFeature('billing.invoices')
  });

  const paymentsQuery = useQuery<PaymentRecord[]>({
    queryKey: ['sales', 'payments'],
    queryFn: salesApi.listPayments,
    enabled: hasFeature('billing.payments')
  });

  const shipmentsQuery = useQuery<ShipmentRecord[]>({
    queryKey: ['sales', 'shipments'],
    queryFn: salesApi.listShipments,
    enabled: hasFeature('logistics.shipments')
  });

  const salesMetricsQuery = useQuery<SalesMetricTotals>({
    queryKey: ['analytics', 'sales-metrics'],
    queryFn: analyticsApi.getSalesMetrics,
    enabled: hasFeature('analytics.standard')
  });

  const recommendationsQuery = useQuery<PriceRecommendationResult>({
    queryKey: ['analytics', 'price-recommendations'],
    queryFn: analyticsApi.getPriceRecommendations,
    enabled: hasFeature('analytics.insights')
  });

  const demandForecastQuery = useQuery<DemandForecast>({
    queryKey: ['analytics', 'demand-forecast'],
    queryFn: analyticsApi.getDemandForecast,
    enabled: hasFeature('analytics.forecasting')
  });

  const nextBestActionsQuery = useQuery<NextBestAction[]>({
    queryKey: ['analytics', 'next-best-actions'],
    queryFn: analyticsApi.getNextBestActions,
    enabled: hasFeature('analytics.forecasting')
  });

  const rfmQuery = useQuery<RfmScore[]>({
    queryKey: ['analytics', 'rfm'],
    queryFn: analyticsApi.getRfmScores,
    enabled: hasFeature('analytics.customer_segments')
  });

  const insightsQuery = useQuery<AnalyticsInsight[]>({
    queryKey: ['analytics', 'insights'],
    queryFn: analyticsApi.getInsights,
    enabled: hasFeature('analytics.insights')
  });

  const rulesQuery = useQuery<AutomationRule[]>({
    queryKey: ['automation', 'rules'],
    queryFn: automationApi.listRules,
    enabled: hasFeature('automation.rules') || hasFeature('automation.core')
  });

  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['automation', 'campaigns'],
    queryFn: automationApi.listCampaigns,
    enabled: hasFeature('automation.campaigns')
  });

  const notificationsQuery = useQuery<NotificationRecord[]>({
    queryKey: ['automation', 'notifications'],
    queryFn: automationApi.listNotifications,
    enabled: hasFeature('automation.notifications')
  });

  const automationWebhooksQuery = useQuery<WebhookEventRecord[]>({
    queryKey: ['automation', 'webhooks'],
    queryFn: automationApi.listWebhooks,
    enabled: hasFeature('automation.webhooks')
  });

  const apiKeysQuery = useQuery<ApiKeyRecord[]>({
    queryKey: ['integrations', 'api-keys'],
    queryFn: integrationsApi.listApiKeys,
    enabled: hasFeature('integrations.api_keys')
  });

  const integrationWebhooksQuery = useQuery<WebhookSubscriptionRecord[]>({
    queryKey: ['integrations', 'webhooks'],
    queryFn: integrationsApi.listWebhooks,
    enabled: hasFeature('integrations.webhooks')
  });

  const connectionsQuery = useQuery<IntegrationConnectionRecord[]>({
    queryKey: ['integrations', 'connections'],
    queryFn: integrationsApi.listConnections,
    enabled: hasFeature('integrations.connectors') || hasFeature('integrations.core')
  });

  const logsQuery = useQuery<IntegrationLogRecord[]>({
    queryKey: ['integrations', 'logs'],
    queryFn: integrationsApi.listLogs,
    enabled: hasFeature('integrations.connectors')
  });

  const importJobsQuery = useQuery<ImportJobRecord[]>({
    queryKey: ['integrations', 'import-jobs'],
    queryFn: integrationsApi.listImportJobs,
    enabled: hasFeature('integrations.imports')
  });

  const conversationsQuery = useQuery<AssistantConversation[]>({
    queryKey: ['assistant', 'conversations'],
    queryFn: assistantApi.listConversations,
    enabled: hasFeature('assistant.chat')
  });

  useEffect(() => {
    if (!selectedConversationId && conversationsQuery.data && conversationsQuery.data.length > 0) {
      setSelectedConversationId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversationsQuery.data?.find((item) => item.id === selectedConversationId) ?? null,
    [conversationsQuery.data, selectedConversationId]
  );

  const noteMutation = useMutation({
    mutationFn: salesApi.createNote,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Заметка сохранена',
        message: 'Новая заметка добавлена в CRM.'
      });
      setNoteContent('');
      setNoteRelated('');
      await queryClient.invalidateQueries({ queryKey: ['sales', 'notes'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать заметку',
        message: 'Повторите попытку позже.'
      });
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: automationApi.createRule,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Правило создано',
        message: 'Автоматизация активирована.'
      });
      setRuleDraft({
        name: '',
        trigger: '',
        description: '',
        conditions: '{"status": "open"}',
        actions: '[{"type":"notify_owner"}]'
      });
      await queryClient.invalidateQueries({ queryKey: ['automation', 'rules'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка создания правила',
        message: 'Проверьте данные и повторите попытку.'
      });
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: automationApi.createCampaign,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Кампания создана',
        message: 'Новая кампания добавлена.'
      });
      setCampaignDraft({ name: '', description: '', status: 'draft', audience: '{"segment": "vip"}' });
      await queryClient.invalidateQueries({ queryKey: ['automation', 'campaigns'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать кампанию',
        message: 'Попробуйте изменить параметры.'
      });
    }
  });

  const createAutomationWebhookMutation = useMutation({
    mutationFn: automationApi.createWebhook,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Вебхук создан',
        message: 'Событие будет доставлено на указанный адрес.'
      });
      await queryClient.invalidateQueries({ queryKey: ['automation', 'webhooks'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка создания вебхука',
        message: 'Проверьте URL и повторите попытку.'
      });
    }
  });

  const createApiKeyMutation = useMutation({
    mutationFn: integrationsApi.createApiKey,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'API-ключ создан',
        message: 'Новый ключ готов к использованию.'
      });
      setApiKeyName('');
      await queryClient.invalidateQueries({ queryKey: ['integrations', 'api-keys'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать ключ',
        message: 'Попробуйте другой идентификатор.'
      });
    }
  });

  const createConnectionMutation = useMutation({
    mutationFn: integrationsApi.createConnection,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Интеграция добавлена',
        message: 'Соединение сохранено.'
      });
      setConnectionDraft({ provider: '', config: '{"endpoint": "https://example.com"}' });
      await queryClient.invalidateQueries({ queryKey: ['integrations', 'connections'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка интеграции',
        message: 'Проверьте настройки подключения.'
      });
    }
  });

  const createImportJobMutation = useMutation({
    mutationFn: integrationsApi.createImportJob,
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Импорт запущен',
        message: 'Статус можно отслеживать в списке задач.'
      });
      setImportJobSource('');
      await queryClient.invalidateQueries({ queryKey: ['integrations', 'import-jobs'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать импорт',
        message: 'Повторите попытку позже.'
      });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: assistantApi.createConversation,
    onSuccess: (conversation) => {
      notificationBus.publish({
        type: 'success',
        title: 'Диалог создан',
        message: 'Можно задавать вопросы ассистенту.'
      });
      setConversationTitle('');
      queryClient.setQueryData<AssistantConversation[]>(['assistant', 'conversations'], (prev) => {
        if (!prev) {
          return [conversation];
        }
        return [conversation, ...prev];
      });
      setSelectedConversationId(conversation.id);
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать диалог',
        message: 'Попробуйте снова.'
      });
    }
  });

  const askMutation = useMutation({
    mutationFn: ({ conversationId, prompt }: { conversationId: number; prompt: string }) =>
      assistantApi.ask(conversationId, prompt),
    onSuccess: (response) => {
      notificationBus.publish({
        type: 'success',
        title: 'Ответ готов',
        message: 'AI-ассистент подготовил рекомендации.'
      });
      setMessageInput('');
      queryClient.setQueryData<AssistantConversation[]>(['assistant', 'conversations'], (prev) => {
        if (!prev) {
          return [response.conversation];
        }
        return prev.map((item) => (item.id === response.conversation.id ? response.conversation : item));
      });
      setSelectedConversationId(response.conversation.id);
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось получить ответ',
        message: 'Проверьте вопрос и попробуйте снова.'
      });
    }
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
        render: (row: OrderDigest) => <StatusBadge status={row.status} tone={orderTone(row.status)} />
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

  const renderFeatureGate = (code: string) => (
    <div className={styles.featureGate}>
      <p>
        Функция доступна на тарифе {featurePlanMap[code] ?? 'Pro'}.{' '}
        <Link to="/pricing">Обновить тариф →</Link>
      </p>
    </div>
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
          <p>Не удалось загрузить данные. Проверьте подключение и попробуйте обновить страницу.</p>
          <Button onClick={() => refetch()}>Повторить</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>CRM — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Рабочее пространство SimplyCRM</h1>
          <p>Контролируйте продажи, аналитику, автоматизации и интеграции в одном месте.</p>
        </div>
        <Button className={styles.refreshButton} onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Обновляем…' : 'Обновить данные'}
        </Button>
      </header>

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <Card key={card.id} className={styles.metricCard}>
            <span className={styles.metricLabel}>{card.label}</span>
            <span className={card.value.length > 12 ? styles.metricValueSmall : styles.metricValue}>{card.value}</span>
            {card.hint ? <span className={styles.metricHint}>{card.hint}</span> : null}
          </Card>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.column}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Пайплайн и сделки</h2>
              <span className={styles.sectionMeta}>
                {data.pipeline.length.toLocaleString('ru-RU')} этапов, {data.recentOpportunities.length.toLocaleString('ru-RU')} активных сделок
              </span>
            </div>
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Срез воронок</h3>
              <DataTable<PipelineSnapshot>
                columns={pipelineColumns}
                data={data.pipeline}
                emptyMessage="Нет активных данных по воронке."
              />
            </div>
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Приоритетные сделки</h3>
              <DataTable<OpportunityDigest>
                columns={opportunityColumns}
                data={data.recentOpportunities}
                emptyMessage="Сделки не найдены."
              />
            </div>
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Заказы и выполнение</h2>
              <span className={styles.sectionMeta}>Полный цикл заказов и отгрузок</span>
            </div>
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>Последние заказы</h3>
              <DataTable<OrderDigest>
                columns={orderColumns}
                data={data.recentOrders}
                emptyMessage="Нет оформленных заказов."
              />
            </div>
            {hasFeature('sales.order_management') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>История покупок</h3>
                <ul className={styles.list}>
                  {(purchasesQuery.data ?? []).map((purchase) => (
                    <li key={purchase.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>Заказ #{purchase.id}</span>
                        <strong>{currencyFormatter.format(purchase.totalAmount)}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>{purchase.contactName ?? 'Не указан'}</span>
                        <span>{formatDateTime(purchase.orderedAt)}</span>
                        <span>{purchase.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {purchasesQuery.data?.length === 0 ? <div className={styles.emptyState}>Нет покупок для отображения.</div> : null}
              </div>
            ) : (
              renderFeatureGate('sales.order_management')
            )}
            {hasFeature('logistics.shipments') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>Отгрузки</h3>
                <ul className={styles.list}>
                  {(shipmentsQuery.data ?? []).map((shipment) => (
                    <li key={shipment.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>#{shipment.id}</span>
                        <strong>{shipment.carrier}</strong>
                        <StatusBadge status={shipment.status} tone={shipmentTone(shipment.status)} />
                      </div>
                      <div className={styles.listSecondary}>
                        <span>Заказ #{shipment.orderId}</span>
                        <span>Отправлено: {formatDate(shipment.shippedAt)}</span>
                        <span>Доставлено: {formatDate(shipment.deliveredAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {shipmentsQuery.data?.length === 0 ? <div className={styles.emptyState}>Отгрузки не найдены.</div> : null}
              </div>
            ) : (
              renderFeatureGate('logistics.shipments')
            )}
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Заметки и взаимодействия</h2>
              <span className={styles.sectionMeta}>Документируйте каждое касание</span>
            </div>
            <form
              className={styles.noteForm}
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteContent.trim()) {
                  notificationBus.publish({
                    type: 'warning',
                    title: 'Заполните текст',
                    message: 'Добавьте содержание заметки.'
                  });
                  return;
                }
                const [objectType, objectId] = noteRelated.split(':');
                noteMutation.mutate({
                  content: noteContent,
                  relatedObjectType: objectType?.trim() || undefined,
                  relatedObjectId: objectId ? Number.parseInt(objectId, 10) : undefined
                });
              }}
            >
              <textarea
                placeholder="Что произошло?"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
              />
              <input
                placeholder="Связь (например, opportunity:12)"
                value={noteRelated}
                onChange={(event) => setNoteRelated(event.target.value)}
              />
              <Button type="submit" disabled={noteMutation.isPending}>
                Добавить заметку
              </Button>
            </form>
            <ul className={styles.notesList}>
              {(notesQuery.data ?? []).map((note) => (
                <li key={note.id} className={styles.noteItem}>
                  <div className={styles.noteHeader}>
                    <strong>{note.authorName ?? 'Без автора'}</strong>
                    <span className={styles.noteMeta}>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className={styles.noteContent}>{note.content}</p>
                  <span className={styles.noteMeta}>
                    {note.relatedObjectType ? `${note.relatedObjectType} #${note.relatedObjectId}` : 'Без связи'}
                  </span>
                </li>
              ))}
            </ul>
            {notesQuery.data?.length === 0 ? <div className={styles.emptyState}>Заметок пока нет.</div> : null}
          </Card>
        </div>
        <div className={styles.column}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Финансовый контроль</h2>
              <span className={styles.sectionMeta}>Счета и оплаты по заказам</span>
            </div>
            {hasFeature('billing.invoices') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>Счета</h3>
                <ul className={styles.list}>
                  {(invoicesQuery.data ?? []).map((invoice) => (
                    <li key={invoice.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>Invoice #{invoice.id}</span>
                        <strong>{currencyFormatter.format(invoice.totalAmount)}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>Заказ #{invoice.orderId}</span>
                        <span>Выставлен: {formatDate(invoice.issuedAt)}</span>
                        <span>Статус: {invoice.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {invoicesQuery.data?.length === 0 ? <div className={styles.emptyState}>Счета не найдены.</div> : null}
              </div>
            ) : (
              renderFeatureGate('billing.invoices')
            )}
            {hasFeature('billing.payments') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>Платежи</h3>
                <ul className={styles.list}>
                  {(paymentsQuery.data ?? []).map((payment) => (
                    <li key={payment.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>Платёж #{payment.id}</span>
                        <strong>{currencyFormatter.format(payment.amount)}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>Invoice #{payment.invoiceId}</span>
                        <span>{payment.provider}</span>
                        <span>{formatDateTime(payment.processedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {paymentsQuery.data?.length === 0 ? <div className={styles.emptyState}>Платежей пока нет.</div> : null}
              </div>
            ) : (
              renderFeatureGate('billing.payments')
            )}
          </Card>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Аналитика и прогнозы</h2>
              <span className={styles.sectionMeta}>Автоаналитика по данным CRM</span>
            </div>
            {hasFeature('analytics.standard') ? (
              <div className={styles.splitGrid}>
                <Card>
                  <strong>Выручка</strong>
                  <span>{salesMetricsQuery.data ? currencyFormatter.format(salesMetricsQuery.data.totalRevenue) : '—'}</span>
                  <small>Средний чек: {salesMetricsQuery.data ? currencyFormatter.format(salesMetricsQuery.data.averageOrderValue) : '—'}</small>
                </Card>
                <Card>
                  <strong>Заказы</strong>
                  <span>{salesMetricsQuery.data ? salesMetricsQuery.data.ordersCount.toLocaleString('ru-RU') : '—'}</span>
                  <small>Основано на последних продажах</small>
                </Card>
              </div>
            ) : (
              renderFeatureGate('analytics.standard')
            )}
            {hasFeature('analytics.customer_segments') && rfmQuery.data ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>RFM сегменты</h3>
                <ul className={styles.list}>
                  {rfmQuery.data.slice(0, 5).map((row) => (
                    <li key={row.customerId} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>Клиент #{row.customerId}</span>
                        <strong>M: {row.monetary.toLocaleString('ru-RU')}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>R: {row.recency ?? '—'}</span>
                        <span>F: {row.frequency}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasFeature('analytics.forecasting') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>Прогноз спроса</h3>
                <div className={styles.splitGrid}>
                  <Card>
                    <strong>Лидеры спроса</strong>
                    <ul className={styles.list}>
                      {(demandForecastQuery.data?.highDemand ?? []).slice(0, 3).map((item) => (
                        <li key={item.variantId}>{item.variantName} — {item.velocity.toLocaleString('ru-RU')} ед./нед</li>
                      ))}
                    </ul>
                  </Card>
                  <Card>
                    <strong>Медленные позиции</strong>
                    <ul className={styles.list}>
                      {(demandForecastQuery.data?.lowVelocity ?? []).slice(0, 3).map((item) => (
                        <li key={item.variantId}>{item.variantName} — {item.velocity.toLocaleString('ru-RU')} ед./нед</li>
                      ))}
                    </ul>
                  </Card>
                </div>
                <h3 className={styles.tableTitle}>Next best actions</h3>
                <ul className={styles.list}>
                  {(nextBestActionsQuery.data ?? []).slice(0, 4).map((action) => (
                    <li key={action.opportunityId} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>Opportunity #{action.opportunityId}</span>
                        <strong>{action.summary}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>{action.reason}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasFeature('analytics.insights') ? (
              <div className={styles.tableSection}>
                <h3 className={styles.tableTitle}>Рекомендации по ценам</h3>
                <ul className={styles.list}>
                  {(recommendationsQuery.data?.recommendations ?? []).slice(0, 4).map((item) => (
                    <li key={item.variantId} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <strong>{item.variantName}</strong>
                        <span className={styles.listTag}>{item.action}</span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>Сток: {item.stockOnHand}</span>
                        <span>Продажи: {item.unitsSold}</span>
                        <span>Маржа: {item.margin.toLocaleString('ru-RU')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <h3 className={styles.tableTitle}>Инсайты</h3>
                <ul className={styles.list}>
                  {(insightsQuery.data ?? []).slice(0, 4).map((insight) => (
                    <li key={insight.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listTag}>{insight.severity}</span>
                        <strong>{insight.title}</strong>
                      </div>
                      <div className={styles.listSecondary}>
                        <span>{formatDateTime(insight.detectedAt)}</span>
                      </div>
                      {insight.description ? <span className={styles.metricHint}>{insight.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Автоматизации</h2>
              <span className={styles.sectionMeta}>Правила, кампании и вебхуки</span>
            </div>
            {hasFeature('automation.core') ? (
              <>
                {hasFeature('automation.rules') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Создать правило</h3>
                    <form
                      className={styles.automationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!ruleDraft.name || !ruleDraft.trigger) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Укажите название и триггер',
                            message: 'Эти поля обязательны.'
                          });
                          return;
                        }
                        const conditions = parseJsonInput<Record<string, unknown>>(ruleDraft.conditions, {}, 'Условия');
                        const actions = parseJsonInput<unknown[]>(ruleDraft.actions, [], 'Действия');
                        if (conditions === null || actions === null) {
                          return;
                        }
                        createRuleMutation.mutate({
                          name: ruleDraft.name,
                          trigger: ruleDraft.trigger,
                          description: ruleDraft.description,
                          conditions,
                          actions
                        });
                      }}
                    >
                      <input
                        placeholder="Название"
                        value={ruleDraft.name}
                        onChange={(event) => setRuleDraft((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <input
                        placeholder="Триггер (например, deal.won)"
                        value={ruleDraft.trigger}
                        onChange={(event) => setRuleDraft((prev) => ({ ...prev, trigger: event.target.value }))}
                      />
                      <textarea
                        placeholder="Описание"
                        value={ruleDraft.description}
                        onChange={(event) => setRuleDraft((prev) => ({ ...prev, description: event.target.value }))}
                      />
                      <textarea
                        placeholder='Условия (JSON)'
                        value={ruleDraft.conditions}
                        onChange={(event) => setRuleDraft((prev) => ({ ...prev, conditions: event.target.value }))}
                      />
                      <textarea
                        placeholder='Действия (JSON-массив)'
                        value={ruleDraft.actions}
                        onChange={(event) => setRuleDraft((prev) => ({ ...prev, actions: event.target.value }))}
                      />
                      <Button type="submit" disabled={createRuleMutation.isPending}>Создать правило</Button>
                    </form>
                    <ul className={styles.list}>
                      {(rulesQuery.data ?? []).map((rule) => (
                        <li key={rule.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{rule.name}</strong>
                            <span className={styles.listTag}>{rule.trigger}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>{rule.isActive ? 'Активно' : 'Отключено'}</span>
                            <span>{formatDateTime(rule.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {rulesQuery.data?.length === 0 ? <div className={styles.emptyState}>Правила ещё не созданы.</div> : null}
                  </div>
                ) : null}
                {hasFeature('automation.campaigns') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Кампании</h3>
                    <form
                      className={styles.automationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!campaignDraft.name) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Название обязательно',
                            message: 'Укажите имя кампании.'
                          });
                          return;
                        }
                        const audience = parseJsonInput<Record<string, unknown>>(campaignDraft.audience, {}, 'Аудитория');
                        if (audience === null) {
                          return;
                        }
                        createCampaignMutation.mutate({
                          name: campaignDraft.name,
                          description: campaignDraft.description,
                          status: campaignDraft.status,
                          audienceDefinition: audience
                        });
                      }}
                    >
                      <input
                        placeholder="Название"
                        value={campaignDraft.name}
                        onChange={(event) => setCampaignDraft((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <input
                        placeholder="Статус (draft/active)"
                        value={campaignDraft.status}
                        onChange={(event) => setCampaignDraft((prev) => ({ ...prev, status: event.target.value }))}
                      />
                      <textarea
                        placeholder="Описание"
                        value={campaignDraft.description}
                        onChange={(event) => setCampaignDraft((prev) => ({ ...prev, description: event.target.value }))}
                      />
                      <textarea
                        placeholder='Аудитория (JSON)'
                        value={campaignDraft.audience}
                        onChange={(event) => setCampaignDraft((prev) => ({ ...prev, audience: event.target.value }))}
                      />
                      <Button type="submit" disabled={createCampaignMutation.isPending}>Создать кампанию</Button>
                    </form>
                    <ul className={styles.list}>
                      {(campaignsQuery.data ?? []).map((campaign) => (
                        <li key={campaign.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{campaign.name}</strong>
                            <span className={styles.listTag}>{campaign.status}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>Старт: {formatDateTime(campaign.startAt)}</span>
                            <span>Аудитория: {Object.keys(campaign.audienceDefinition).length}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {campaignsQuery.data?.length === 0 ? <div className={styles.emptyState}>Кампаний пока нет.</div> : null}
                  </div>
                ) : null}
                {hasFeature('automation.webhooks') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Вебхуки автоматизаций</h3>
                    <form
                      className={styles.automationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const url = String(formData.get('automationWebhookUrl') ?? '').trim();
                        const eventType = String(formData.get('automationWebhookEvent') ?? '').trim();
                        if (!url || !eventType) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Укажите URL и событие',
                            message: 'Эти поля обязательны.'
                          });
                          return;
                        }
                        createAutomationWebhookMutation.mutate({ url, eventType });
                        event.currentTarget.reset();
                      }}
                    >
                      <input name="automationWebhookUrl" placeholder="https://example.com/webhook" />
                      <input name="automationWebhookEvent" placeholder="event.type" />
                      <Button type="submit" disabled={createAutomationWebhookMutation.isPending}>
                        Добавить вебхук
                      </Button>
                    </form>
                    <ul className={styles.list}>
                      {(automationWebhooksQuery.data ?? []).map((webhook) => (
                        <li key={webhook.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{webhook.eventType}</strong>
                            <span className={styles.listTag}>{webhook.status}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>{webhook.url}</span>
                            <span>{formatDateTime(webhook.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {hasFeature('automation.notifications') && notificationsQuery.data ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Последние уведомления</h3>
                    <ul className={styles.list}>
                      {notificationsQuery.data.slice(0, 4).map((notification) => (
                        <li key={notification.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{notification.channel}</strong>
                            <span className={styles.listTag}>{notification.status}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>{formatDateTime(notification.scheduledAt)}</span>
                            <span>{notification.template}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              renderFeatureGate('automation.core')
            )}
          </Card>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Интеграции и API</h2>
              <span className={styles.sectionMeta}>API-ключи, коннекторы и импорты</span>
            </div>
            {hasFeature('integrations.core') ? (
              <>
                {hasFeature('integrations.api_keys') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>API-ключи</h3>
                    <form
                      className={styles.integrationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!apiKeyName.trim()) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Укажите название ключа',
                            message: 'Название необходимо для поиска ключа.'
                          });
                          return;
                        }
                        const permissions = apiKeyScopes
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean);
                        createApiKeyMutation.mutate({
                          name: apiKeyName,
                          key: generateApiKey(),
                          permissions
                        });
                      }}
                    >
                      <input
                        placeholder="Название ключа"
                        value={apiKeyName}
                        onChange={(event) => setApiKeyName(event.target.value)}
                      />
                      <input
                        placeholder="Разрешения (через запятую)"
                        value={apiKeyScopes}
                        onChange={(event) => setApiKeyScopes(event.target.value)}
                      />
                      <Button type="submit" disabled={createApiKeyMutation.isPending}>Создать ключ</Button>
                    </form>
                    <ul className={styles.list}>
                      {(apiKeysQuery.data ?? []).map((key) => (
                        <li key={key.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{key.name}</strong>
                            <span className={styles.listTag}>{key.permissions.join(', ') || '—'}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>{key.key}</span>
                            <span>Создан: {formatDateTime(key.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {hasFeature('integrations.connectors') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Коннекторы</h3>
                    <form
                      className={styles.integrationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!connectionDraft.provider.trim()) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Укажите провайдера',
                            message: 'Введите идентификатор коннектора.'
                          });
                          return;
                        }
                        const config = parseJsonInput<Record<string, unknown>>(connectionDraft.config, {}, 'Конфигурация');
                        if (config === null) {
                          return;
                        }
                        createConnectionMutation.mutate({
                          provider: connectionDraft.provider,
                          config
                        });
                      }}
                    >
                      <input
                        placeholder="Провайдер (например, hubspot)"
                        value={connectionDraft.provider}
                        onChange={(event) => setConnectionDraft((prev) => ({ ...prev, provider: event.target.value }))}
                      />
                      <textarea
                        placeholder='Конфигурация (JSON)'
                        value={connectionDraft.config}
                        onChange={(event) => setConnectionDraft((prev) => ({ ...prev, config: event.target.value }))}
                      />
                      <Button type="submit" disabled={createConnectionMutation.isPending}>Добавить коннектор</Button>
                    </form>
                    <ul className={styles.list}>
                      {(connectionsQuery.data ?? []).map((connection) => (
                        <li key={connection.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{connection.provider}</strong>
                            <span className={styles.listTag}>{connection.status}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>{Object.keys(connection.config).length} параметров</span>
                            <span>Синхр.: {formatDateTime(connection.lastSyncedAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {logsQuery.data && logsQuery.data.length > 0 ? (
                      <details>
                        <summary>Журнал событий ({logsQuery.data.length})</summary>
                        <ul className={styles.list}>
                          {logsQuery.data.slice(0, 5).map((log) => (
                            <li key={log.id} className={styles.listItem}>
                              <div className={styles.listPrimary}>
                                <strong>{log.level}</strong>
                                <span className={styles.listTag}>Коннектор #{log.connection}</span>
                              </div>
                              <div className={styles.listSecondary}>
                                <span>{formatDateTime(log.createdAt)}</span>
                                <span>{log.message}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                ) : null}
                {hasFeature('integrations.webhooks') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Вебхуки интеграций</h3>
                    <ul className={styles.list}>
                      {(integrationWebhooksQuery.data ?? []).map((webhook) => (
                        <li key={webhook.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{webhook.url}</strong>
                            <span className={styles.listTag}>{webhook.isActive ? 'Активен' : 'Выключен'}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>События: {webhook.eventTypes.join(', ') || '—'}</span>
                            <span>Создан: {formatDateTime(webhook.createdAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {hasFeature('integrations.imports') ? (
                  <div className={styles.tableSection}>
                    <h3 className={styles.tableTitle}>Импорт данных</h3>
                    <form
                      className={styles.integrationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!importJobSource.trim()) {
                          notificationBus.publish({
                            type: 'warning',
                            title: 'Источник обязателен',
                            message: 'Укажите название источника данных.'
                          });
                          return;
                        }
                        createImportJobMutation.mutate({ dataSource: importJobSource });
                      }}
                    >
                      <input
                        placeholder="Источник (например, s3://bucket/report.xlsx)"
                        value={importJobSource}
                        onChange={(event) => setImportJobSource(event.target.value)}
                      />
                      <Button type="submit" disabled={createImportJobMutation.isPending}>Запустить импорт</Button>
                    </form>
                    <ul className={styles.list}>
                      {(importJobsQuery.data ?? []).map((job) => (
                        <li key={job.id} className={styles.listItem}>
                          <div className={styles.listPrimary}>
                            <strong>{job.dataSource}</strong>
                            <span className={styles.listTag}>{job.status}</span>
                          </div>
                          <div className={styles.listSecondary}>
                            <span>Начало: {formatDateTime(job.startedAt)}</span>
                            <span>Завершение: {formatDateTime(job.completedAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              renderFeatureGate('integrations.core')
            )}
          </Card>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>AI-ассистент</h2>
              <span className={styles.sectionMeta}>Быстрые ответы по данным CRM</span>
            </div>
            {hasFeature('assistant.chat') ? (
              <div className={styles.assistantLayout}>
                <div className={styles.assistantSidebar}>
                  <form
                    className={styles.integrationForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!conversationTitle.trim()) {
                        notificationBus.publish({
                          type: 'warning',
                          title: 'Название диалога',
                          message: 'Введите тему запроса.'
                        });
                        return;
                      }
                      createConversationMutation.mutate({
                        title: conversationTitle,
                        systemPrompt: conversationPrompt
                      });
                    }}
                  >
                    <input
                      placeholder="Тема диалога"
                      value={conversationTitle}
                      onChange={(event) => setConversationTitle(event.target.value)}
                    />
                    <textarea
                      placeholder="Системный промпт"
                      value={conversationPrompt}
                      onChange={(event) => setConversationPrompt(event.target.value)}
                    />
                    <Button type="submit" disabled={createConversationMutation.isPending}>Новый диалог</Button>
                  </form>
                  <ul className={styles.conversationList}>
                    {(conversationsQuery.data ?? []).map((conversation) => (
                      <li
                        key={conversation.id}
                        data-active={conversation.id === selectedConversationId}
                        onClick={() => setSelectedConversationId(conversation.id)}
                      >
                        <strong>{conversation.title}</strong>
                        <span>{formatDateTime(conversation.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.assistantContent}>
                  {selectedConversation ? (
                    <>
                      <div className={styles.messages}>
                        {selectedConversation.messages.length === 0 ? (
                          <div className={styles.emptyState}>Сообщений пока нет. Задайте вопрос ассистенту.</div>
                        ) : (
                          selectedConversation.messages.map((message) => (
                            <div key={message.id} className={styles.message} data-role={message.role}>
                              <div className={styles.messageRole}>{message.role === 'assistant' ? 'AI' : 'Вы'}</div>
                              <div className={styles.messageBody}>{message.content}</div>
                              <div className={styles.messageMeta}>{formatDateTime(message.createdAt)}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        className={styles.messageForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!messageInput.trim()) {
                            notificationBus.publish({
                              type: 'warning',
                              title: 'Введите вопрос',
                              message: 'Поле сообщения не может быть пустым.'
                            });
                            return;
                          }
                          askMutation.mutate({
                            conversationId: selectedConversation.id,
                            prompt: messageInput
                          });
                        }}
                      >
                        <textarea
                          placeholder="Задайте вопрос ассистенту"
                          value={messageInput}
                          onChange={(event) => setMessageInput(event.target.value)}
                        />
                        <Button type="submit" disabled={askMutation.isPending}>Отправить</Button>
                      </form>
                    </>
                  ) : (
                    <div className={styles.emptyState}>Выберите или создайте диалог, чтобы начать общение.</div>
                  )}
                </div>
              </div>
            ) : (
              renderFeatureGate('assistant.chat')
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
