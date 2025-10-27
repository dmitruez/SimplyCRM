import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';

import { adminApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/DataTable';
import { useAuthContext } from '../providers/AuthProvider';
import {
  AdminActivityRecord,
  AdminPlanOption,
  AdminPlanRequest,
  AdminUserRecord
} from '../types/admin';
import styles from './AdminPage.module.css';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

const priorityLabel: Record<AdminPlanRequest['priority'], string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий'
};

const statusTone: Record<AdminPlanRequest['status'], 'warning' | 'neutral' | 'success'> = {
  new: 'warning',
  contacted: 'neutral',
  approved: 'success',
  rejected: 'neutral'
};

const statusLabel: Record<AdminPlanRequest['status'], string> = {
  new: 'Новая',
  contacted: 'В работе',
  approved: 'Одобрена',
  rejected: 'Отклонена'
};

const trendIcon: Record<'up' | 'down' | 'steady', string> = {
  up: '▲',
  down: '▼',
  steady: '⟲'
};

export const AdminPage = () => {
  const queryClient = useQueryClient();
  const { profile, status } = useAuthContext();

  const hasAdminFlag = Boolean(
    profile?.featureFlags?.some((flag) => flag.code === 'admin.panel' && flag.enabled)
  );
  const isAdmin = hasAdminFlag || Boolean(profile?.isStaff) || Boolean(profile?.isSuperuser);

  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.getOverview,
    enabled: isAdmin
  });

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
    enabled: isAdmin
  });

  const { data: plans } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: adminApi.listPlans,
    staleTime: Infinity,
    enabled: isAdmin
  });

  const { data: requests, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: adminApi.listPlanRequests,
    enabled: isAdmin
  });

  const { data: activity } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: adminApi.listActivity,
    enabled: isAdmin
  });

  const [selectedPlans, setSelectedPlans] = useState<Record<number, string>>({});

  useEffect(() => {
    if (users) {
      const initial = users.reduce<Record<number, string>>((acc, user) => {
        acc[user.id] = user.planKey;
        return acc;
      }, {});
      setSelectedPlans(initial);
    }
  }, [users]);

  const revenueMax = useMemo(() => {
    if (!overview?.revenueTrend?.length) {
      return 1;
    }
    return Math.max(...overview.revenueTrend.map((point) => point.value));
  }, [overview?.revenueTrend]);

  const assignMutation = useMutation({
    mutationFn: adminApi.assignPlan,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUserRecord[] | undefined>(['admin', 'users'], (current) =>
        current?.map((user) => (user.id === updatedUser.id ? updatedUser : user)) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: adminApi.revokePlan,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUserRecord[] | undefined>(['admin', 'users'], (current) =>
        current?.map((user) => (user.id === updatedUser.id ? updatedUser : user)) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] });
    }
  });

  const respondMutation = useMutation({
    mutationFn: adminApi.respondToRequest,
    onSuccess: (updatedRequest) => {
      queryClient.setQueryData<AdminPlanRequest[] | undefined>(['admin', 'requests'], (current) =>
        current?.map((request) => (request.id === updatedRequest.id ? updatedRequest : request)) ?? []
      );
    }
  });

  const sortedRequests = useMemo(() => {
    if (!requests) return [];
    const priorityOrder: Record<AdminPlanRequest['priority'], number> = {
      high: 0,
      medium: 1,
      low: 2
    };
    const statusOrder: Record<AdminPlanRequest['status'], number> = {
      new: 0,
      contacted: 1,
      approved: 2,
      rejected: 3
    };
    return [...requests].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [requests]);

  const assignPendingUserId = (assignMutation.variables as { userId: number } | undefined)?.userId;
  const revokePendingUserId = revokeMutation.variables as number | undefined;

  const handleAssign = (userId: number) => {
    const planKey = selectedPlans[userId];
    if (!planKey) return;
    const current = users?.find((user) => user.id === userId);
    if (current && current.planKey === planKey) {
      return;
    }
    assignMutation.mutate({ userId, planKey });
  };

  const handleRevoke = (userId: number) => {
    revokeMutation.mutate(userId);
  };

  const handleRespond = (requestId: number, status: 'approved' | 'rejected' | 'contacted') => {
    respondMutation.mutate({ requestId, status });
  };

  if (status === 'loading' || status === 'idle') {
    return <div className={styles.state}>Загрузка административной панели…</div>;
  }

  if (!isAdmin) {
    return (
      <div className={styles.gate}>
        <Helmet>
          <title>Административная панель — доступ ограничен</title>
        </Helmet>
        <Card className={styles.gateCard}>
          <h1>Нет доступа к административной панели</h1>
          <p>
            Для управления тарифами и просмотром аналитики необходимо получить право{' '}
            <strong>admin.panel</strong>. Владельцы организаций и сотрудники SimplyCRM получают доступ автоматически —
            обратитесь к владельцу организации или поддержке SimplyCRM для выдачи прав.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Административная консоль — SimplyCRM</title>
      </Helmet>
      <section className={styles.hero}>
        <div className={styles.heroGradient} aria-hidden />
        <div className={styles.heroContent}>
          <div>
            <h1>Административная консоль</h1>
            <p>
              Контролируйте тарифы, здоровье клиентов и апгрейды в одном месте. Панель автоматически
              обновляется на основе активности SimplyCRM.
            </p>
            <div className={styles.heroPills}>
              <span>Роадмап тарифов</span>
              <span>Мониторинг SLA</span>
              <span>Продление подписок</span>
            </div>
          </div>
          <div className={styles.heroMetrics}>
            {(overview?.metrics ?? []).slice(0, 2).map((metric) => (
              <div key={metric.id} className={styles.heroMetric}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>{metric.value}</span>
                <span className={styles.metricDelta} data-trend={metric.trend ?? 'steady'}>
                  {trendIcon[metric.trend ?? 'steady']} {metric.delta}% · {metric.deltaLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.metricGrid}>
        {(overview?.metrics ?? []).map((metric) => (
          <Card key={metric.id} className={styles.metricCard}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            <span className={styles.metricDelta} data-trend={metric.trend ?? 'steady'}>
              {trendIcon[metric.trend ?? 'steady']} {metric.delta}%
              {metric.deltaLabel ? ` · ${metric.deltaLabel}` : ''}
            </span>
          </Card>
        ))}
        {isOverviewLoading ? <div className={styles.loadingOverlay}>Загрузка метрик…</div> : null}
      </section>

      <section className={styles.planSection}>
        <Card className={styles.planCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Заполненность тарифов</h2>
              <p>Следите за загрузкой лицензий и вовлечённостью по каждому тарифу.</p>
            </div>
          </div>
          <div className={styles.distributionList}>
            {(overview?.planDistribution ?? []).map((item) => (
              <div key={item.planKey} className={styles.distributionItem}>
                <div className={styles.distributionMeta}>
                  <span className={styles.distributionName}>{item.planName}</span>
                  <span className={styles.distributionValue}>
                    {item.seatsUsed} / {item.seatsTotal} лицензий
                  </span>
                </div>
                <div className={styles.distributionBar}>
                  <div
                    className={styles.distributionFill}
                    style={{ width: `${item.percentage}%`, background: item.color }}
                  />
                </div>
                <span className={styles.distributionPercent}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className={styles.revenueCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Динамика выручки</h2>
              <p>Сводный прогноз на основе активности клиентов и биллинга.</p>
            </div>
          </div>
          <div className={styles.revenueSparkline}>
            {(overview?.revenueTrend ?? []).map((point) => (
              <div key={point.label} className={styles.revenuePoint}>
                <div
                  className={styles.revenueBar}
                  style={{ height: `${Math.max(18, Math.round((point.value / revenueMax) * 100))}%` }}
                />
                <span>{point.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.revenueSummary}>
            <div>
              <span className={styles.metricLabel}>Удержание</span>
              <strong>{overview?.retentionRate ?? 0}%</strong>
            </div>
            <div>
              <span className={styles.metricLabel}>CSAT</span>
              <strong>{overview?.satisfactionScore?.toFixed(1)}</strong>
            </div>
            <div>
              <span className={styles.metricLabel}>NPS</span>
              <strong>{overview?.nps ?? 0}</strong>
            </div>
          </div>
        </Card>
      </section>

      <section className={styles.usersSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Клиенты и тарифы</h2>
            <p>Назначайте планы, отслеживайте вовлечённость и расход лицензий.</p>
          </div>
          <div className={styles.sectionActions}>
            <span className={styles.sectionHint}>
              Активных компаний: {users?.filter((user) => user.status === 'active').length ?? 0}
            </span>
          </div>
        </div>
        <div className={styles.userGrid}>
          {isUsersLoading ? <div className={styles.loadingOverlay}>Загрузка клиентов…</div> : null}
          {(users ?? []).map((user) => (
            <Card key={user.id} className={styles.userCard}>
              <div className={styles.userHeader}>
                <div className={styles.userIdentity}>
                  <span className={styles.userAvatar} style={{ background: user.avatarColor }}>
                    {user.fullName
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <div>
                    <strong>{user.organization}</strong>
                    <span>{user.fullName}</span>
                    <span className={styles.userEmail}>{user.email}</span>
                  </div>
                </div>
                <div className={styles.userTags}>
                  {user.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className={styles.userStats}>
                <div>
                  <span className={styles.metricLabel}>Занятость лицензий</span>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.round((user.seatsUsed / user.seatsTotal) * 100)}%` }}
                    />
                  </div>
                  <span className={styles.metricHint}>
                    {user.seatsUsed} из {user.seatsTotal} мест · {user.planName}
                  </span>
                </div>
                <div>
                  <span className={styles.metricLabel}>MRR</span>
                  <span className={styles.metricValueSmall}>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      maximumFractionDigits: 0
                    }).format(user.monthlySpend)}
                  </span>
                  <span className={styles.metricHint}>
                    Здоровье {user.healthScore}% · Тренд {user.usageTrend > 0 ? '+' : ''}
                    {user.usageTrend}%
                  </span>
                </div>
              </div>
              <div className={styles.userActions}>
                <div className={styles.userPlanControl}>
                  <label htmlFor={`plan-${user.id}`}>Тариф</label>
                  <select
                    id={`plan-${user.id}`}
                    value={selectedPlans[user.id] ?? user.planKey}
                    onChange={(event) =>
                      setSelectedPlans((prev) => ({ ...prev, [user.id]: event.target.value }))
                    }
                    className={styles.planSelect}
                    disabled={
                      (assignMutation.isPending && assignPendingUserId === user.id) ||
                      (revokeMutation.isPending && revokePendingUserId === user.id)
                    }
                  >
                    {(plans ?? []).map((plan) => (
                      <option key={plan.key} value={plan.key}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.userButtons}>
                  <Button
                    variant="primary"
                    onClick={() => handleAssign(user.id)}
                    disabled={assignMutation.isPending && assignPendingUserId === user.id}
                  >
                    Назначить
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRevoke(user.id)}
                    disabled={revokeMutation.isPending && revokePendingUserId === user.id}
                  >
                    Снять тариф
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <Card className={styles.requestsCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Заявки на апгрейд</h2>
              <p>Быстрый инбокс запросов на повышение тарифов.</p>
            </div>
            <span className={styles.sectionHint}>
              Новых: {requests?.filter((request) => request.status === 'new').length ?? 0}
            </span>
          </div>
          {isRequestsLoading ? <div className={styles.loadingOverlay}>Синхронизация заявок…</div> : null}
          <div className={styles.requestList}>
            {sortedRequests.map((request) => (
              <article key={request.id} className={styles.requestItem}>
                <header className={styles.requestHeader}>
                  <div>
                    <h3>{request.organization}</h3>
                    <span className={styles.metricHint}>
                      {request.contactName} · {request.contactEmail}
                    </span>
                  </div>
                  <StatusBadge status={statusLabel[request.status]} tone={statusTone[request.status]} />
                </header>
                <p className={styles.requestMessage}>{request.message}</p>
                <div className={styles.requestMeta}>
                  <span>Текущий: {request.currentPlan}</span>
                  <span>Запрос: {request.requestedPlan}</span>
                  <span>Приоритет: {priorityLabel[request.priority]}</span>
                  <span>{formatDateTime(request.submittedAt)}</span>
                </div>
                <div className={styles.requestActions}>
                  <Button
                    variant="primary"
                    onClick={() => handleRespond(request.id, 'approved')}
                    disabled={respondMutation.isPending}
                  >
                    Одобрить
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRespond(request.id, 'contacted')}
                    disabled={respondMutation.isPending}
                  >
                    Связались
                  </Button>
                  <button
                    type="button"
                    className={clsx(styles.ghostButton, respondMutation.isPending && styles.disabledButton)}
                    onClick={() => handleRespond(request.id, 'rejected')}
                    disabled={respondMutation.isPending}
                  >
                    Отклонить
                  </button>
                </div>
              </article>
            ))}
            {sortedRequests.length === 0 && !isRequestsLoading ? (
              <div className={styles.emptyState}>Заявки пока не поступали.</div>
            ) : null}
          </div>
        </Card>

        <Card className={styles.activityCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Лента активности</h2>
              <p>Последние системные события и ручные изменения тарифов.</p>
            </div>
          </div>
          <ul className={styles.activityList}>
            {(activity ?? []).map((item: AdminActivityRecord) => (
              <li key={item.id} className={styles.activityItem} data-tone={item.tone}>
                <div className={styles.activityIcon}>{item.icon}</div>
                <div>
                  <div className={styles.activityTitle}>
                    <strong>{item.actor}</strong> {item.action}
                    <span className={styles.activityTarget}>{item.target}</span>
                  </div>
                  <div className={styles.activityMeta}>{formatDateTime(item.timestamp)}</div>
                  {item.description ? <p className={styles.activityDescription}>{item.description}</p> : null}
                </div>
              </li>
            ))}
            {(activity ?? []).length === 0 ? (
              <div className={styles.emptyState}>Активность ещё не записана.</div>
            ) : null}
          </ul>
        </Card>
      </section>

      <section className={styles.planShowcase}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Витрина тарифов</h2>
            <p>Наглядное сравнение возможностей для консультаций клиентов.</p>
          </div>
        </div>
        <div className={styles.planGrid}>
          {(plans ?? []).map((plan: AdminPlanOption) => (
            <Card key={plan.key} className={clsx(styles.planTile, plan.recommended && styles.planTileRecommended)}>
              <div className={styles.planTileHeader} style={{ background: plan.highlightColor }}>
                <div>
                  <h3>{plan.name}</h3>
                  <span className={styles.planPrice}>
                    {plan.pricePerSeat === 0
                      ? '0₽'
                      : `${plan.pricePerSeat.toLocaleString('ru-RU')}₽`} / место
                  </span>
                </div>
                {plan.badge ? <span className={styles.planBadge}>{plan.badge}</span> : null}
              </div>
              <p className={styles.planDescription}>{plan.description}</p>
              <ul className={styles.planFeatureList}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.recommended ? <span className={styles.planRecommendedNote}>Рекомендуем для scaling-команд</span> : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
