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
  AdminPipelineDeal,
  AdminPipelineLane,
  AdminPipelineStageId,
  AdminPlanOption,
  AdminPlanRequest,
  AdminSignal,
  AdminTask,
  AdminTeamMember,
  AdminUserRecord
} from '../types/admin';
import styles from './AdminPage.module.css';

const NAV_SECTIONS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'companies', label: 'Компании' },
  { id: 'pipeline', label: 'Воронка' },
  { id: 'requests', label: 'Запросы' },
  { id: 'activity', label: 'Активность' }
] as const;

type SectionId = (typeof NAV_SECTIONS)[number]['id'];

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

const companyStatusLabel: Record<AdminUserRecord['status'], string> = {
  active: 'Активна',
  trialing: 'Пробный период',
  invited: 'Приглашена',
  suspended: 'Приостановлена'
};

const lifecycleLabel: Record<AdminUserRecord['lifecycleStage'], string> = {
  onboarding: 'Онбординг',
  active: 'Активный клиент',
  expansion: 'Расширение',
  risk: 'Требует внимания'
};

const healthLabel: Record<AdminUserRecord['healthStatus'], string> = {
  healthy: 'Здоров',
  attention: 'Нужен фокус',
  risk: 'Риск ухода'
};

const severityLabel: Record<AdminSignal['severity'], string> = {
  info: 'Информация',
  warning: 'Предупреждение',
  danger: 'Критично'
};

const severityTone: Record<AdminSignal['severity'], 'info' | 'warning' | 'success'> = {
  info: 'info',
  warning: 'warning',
  danger: 'warning'
};

const teamStatusTone: Record<AdminTeamMember['status'], 'neutral' | 'success' | 'warning'> = {
  available: 'success',
  busy: 'warning',
  offline: 'neutral'
};

const teamStatusLabel: Record<AdminTeamMember['status'], string> = {
  available: 'В сети',
  busy: 'Занят',
  offline: 'Оффлайн'
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('ru-RU');

const formatDateTime = (value: string) => new Date(value).toLocaleString('ru-RU');

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value);

const formatPercent = (value: number) => `${Math.round(value)}%`;

const NAV_OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: '-45% 0px -45% 0px',
  threshold: [0.2, 0.45]
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
    enabled: isAdmin,
    staleTime: Infinity
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

  const { data: pipeline, isLoading: isPipelineLoading } = useQuery({
    queryKey: ['admin', 'pipeline'],
    queryFn: adminApi.listPipeline,
    enabled: isAdmin
  });

  const { data: tasks } = useQuery({
    queryKey: ['admin', 'tasks'],
    queryFn: adminApi.listTasks,
    enabled: isAdmin
  });

  const { data: signals } = useQuery({
    queryKey: ['admin', 'signals'],
    queryFn: adminApi.listSignals,
    enabled: isAdmin
  });

  const { data: team } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: adminApi.listTeam,
    enabled: isAdmin
  });

  const [selectedPlans, setSelectedPlans] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminUserRecord['status']>('all');
  const [planFilter, setPlanFilter] = useState<'all' | string>('all');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const heroName = useMemo(() => {
    if (!profile) {
      return 'команда';
    }
    const bag = profile as unknown as Record<string, unknown>;
    for (const key of ['first_name', 'firstName', 'fullName', 'username']) {
      const value = bag[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return 'команда';
  }, [profile]);

  useEffect(() => {
    if (users) {
      const initial = users.reduce<Record<number, string>>((acc, user) => {
        acc[user.id] = user.planKey;
        return acc;
      }, {});
      setSelectedPlans(initial);
    }
  }, [users]);

  const assignMutation = useMutation({
    mutationFn: adminApi.assignPlan,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUserRecord[] | undefined>(['admin', 'users'], (current) =>
        current?.map((user) => (user.id === updatedUser.id ? updatedUser : user)) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: adminApi.revokePlan,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUserRecord[] | undefined>(['admin', 'users'], (current) =>
        current?.map((user) => (user.id === updatedUser.id ? updatedUser : user)) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
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

  const moveDealMutation = useMutation({
    mutationFn: adminApi.moveDealToStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pipeline'] });
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: adminApi.completeTask,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<AdminTask[] | undefined>(['admin', 'tasks'], (current) =>
        current?.map((task) => (task.id === updatedTask.id ? updatedTask : task)) ?? []
      );
    }
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: adminApi.snoozeTask,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<AdminTask[] | undefined>(['admin', 'tasks'], (current) =>
        current?.map((task) => (task.id === updatedTask.id ? updatedTask : task)) ?? []
      );
    }
  });

  const dismissSignalMutation = useMutation({
    mutationFn: adminApi.dismissSignal,
    onSuccess: (signalId) => {
      queryClient.setQueryData<AdminSignal[] | undefined>(['admin', 'signals'], (current) =>
        current?.filter((signal) => signal.id !== signalId) ?? []
      );
    }
  });

  const filteredCompanies = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const matchesSearch =
        normalized.length === 0 ||
        [user.organization, user.fullName, user.segment, user.accountOwner]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesPlan = planFilter === 'all' || user.planKey === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [users, searchTerm, statusFilter, planFilter]);

  useEffect(() => {
    if (filteredCompanies.length === 0) {
      setSelectedCompanyId(null);
      return;
    }
    if (!selectedCompanyId || !filteredCompanies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(filteredCompanies[0].id);
    }
  }, [filteredCompanies, selectedCompanyId]);

  useEffect(() => {
    const sections = NAV_SECTIONS.map((section) => document.getElementById(section.id));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) {
        setActiveSection(visible.target.id as SectionId);
      }
    }, NAV_OBSERVER_OPTIONS);

    sections.forEach((section) => section && observer.observe(section));
    return () => {
      sections.forEach((section) => section && observer.unobserve(section));
    };
  }, []);

  const arrTotal = useMemo(
    () => (users ?? []).reduce((acc, user) => acc + user.arr, 0),
    [users]
  );

  const activeDeals = useMemo(
    () => (pipeline ?? []).reduce((acc, lane) => acc + lane.deals.length, 0),
    [pipeline]
  );

  const atRiskCompanies = useMemo(
    () => (users ?? []).filter((user) => user.healthStatus === 'risk').length,
    [users]
  );

  const expansionCompanies = useMemo(
    () => (users ?? []).filter((user) => user.lifecycleStage === 'expansion').length,
    [users]
  );

  const averageHealthScore = useMemo(() => {
    if (!users?.length) return 0;
    const total = users.reduce((acc, user) => acc + user.healthScore, 0);
    return Math.round(total / users.length);
  }, [users]);

  const segmentStats = useMemo(() => {
    const map = new Map<string, { companies: number; arr: number }>();
    (users ?? []).forEach((user) => {
      const current = map.get(user.segment) ?? { companies: 0, arr: 0 };
      current.companies += 1;
      current.arr += user.arr;
      map.set(user.segment, current);
    });

    return Array.from(map.entries())
      .map(([segment, value]) => ({ segment, ...value }))
      .sort((a, b) => b.arr - a.arr)
      .slice(0, 4);
  }, [users]);

  const planFilterOptions = useMemo(() => {
    const options = (plans ?? []).map((plan) => ({ value: plan.key, label: plan.name }));
    return [{ value: 'all', label: 'Все тарифы' }, ...options];
  }, [plans]);

  const selectedCompany = useMemo(
    () => filteredCompanies.find((company) => company.id === selectedCompanyId) ?? null,
    [filteredCompanies, selectedCompanyId]
  );

  const upcomingRenewals = useMemo(() => {
    if (!users?.length) return [] as AdminUserRecord[];
    const today = Date.now();
    const msInDay = 1000 * 60 * 60 * 24;
    return users
      .filter((user) => user.status === 'active')
      .map((user) => ({
        user,
        daysUntil: Math.round((new Date(user.renewalDate).getTime() - today) / msInDay)
      }))
      .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 45)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .map((item) => item.user)
      .slice(0, 5);
  }, [users]);

  const trialExpiring = useMemo(() => {
    if (!users?.length) return [] as AdminUserRecord[];
    const today = Date.now();
    const msInDay = 1000 * 60 * 60 * 24;
    return users
      .filter((user) => user.status === 'trialing')
      .map((user) => ({
        user,
        daysUntil: Math.round((new Date(user.renewalDate).getTime() - today) / msInDay)
      }))
      .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 21)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .map((item) => item.user)
      .slice(0, 5);
  }, [users]);

  const criticalSignals = useMemo(() => (signals ?? []).filter((signal) => signal.severity !== 'info'), [signals]);

  const quickActions = useMemo(
    () => {
      const newRequestsCount =
        requests?.filter((request) => request.status === 'new').length ?? 0;
      const renewalSoonCount = upcomingRenewals.length;
      return [
        {
          id: 'requests' as SectionId,
          icon: '🚀',
          label: 'Апгрейды',
          description:
            newRequestsCount > 0
              ? `${newRequestsCount} ждут реакции`
              : 'Все запросы обработаны'
        },
        {
          id: 'companies' as SectionId,
          icon: '🛟',
          label: 'Риски',
          description:
            atRiskCompanies > 0
              ? `${atRiskCompanies} компании под угрозой`
              : 'Рисков нет'
        },
        {
          id: 'pipeline' as SectionId,
          icon: '📊',
          label: 'Воронка',
          description:
            activeDeals > 0 ? `${activeDeals} активных сделок` : 'Нет активных сделок'
        },
        {
          id: 'overview' as SectionId,
          icon: '🗓️',
          label: 'Продления',
          description:
            renewalSoonCount > 0
              ? `${renewalSoonCount} продления < 45 дн.`
              : 'Продления под контролем'
        }
      ];
    },
    [requests, atRiskCompanies, activeDeals, upcomingRenewals.length]
  );

  const tasksInFlight = useMemo(
    () => (tasks ?? []).filter((task) => task.status !== 'done'),
    [tasks]
  );

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

  const selectedCompanyTasks = useMemo(() => {
    if (!selectedCompany) return [] as AdminTask[];
    return tasksInFlight
      .filter((task) => task.companyId === selectedCompany.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [selectedCompany, tasksInFlight]);

  const selectedCompanySignals = useMemo(() => {
    if (!selectedCompany) return [] as AdminSignal[];
    return (signals ?? [])
      .filter((signal) => signal.companyId === selectedCompany.id)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [selectedCompany, signals]);

  const selectedCompanyDeals = useMemo(() => {
    if (!selectedCompany || !pipeline) return [] as (AdminPipelineDeal & { stageName: string })[];
    const deals: (AdminPipelineDeal & { stageName: string })[] = [];
    pipeline.forEach((lane) => {
      lane.deals
        .filter((deal) => deal.companyId === selectedCompany.id)
        .forEach((deal) => {
          deals.push({ ...deal, stageName: lane.name });
        });
    });
    return deals;
  }, [selectedCompany, pipeline]);

  const handleNavigate = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const handleMoveDeal = (deal: AdminPipelineDeal, stageId: AdminPipelineStageId) => {
    if (deal.stageId === stageId) return;
    moveDealMutation.mutate({ dealId: deal.id, stageId });
  };

  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  const handleSnoozeTask = (taskId: number) => {
    snoozeTaskMutation.mutate({ taskId });
  };

  const handleDismissSignal = (signalId: number) => {
    dismissSignalMutation.mutate(signalId);
  };

  if (status === 'loading' || status === 'idle') {
    return <div className={styles.state}>Загружаем административную консоль…</div>;
  }

  if (!isAdmin) {
    return (
      <div className={styles.gate}>
        <Helmet>
          <title>Административная панель — доступ ограничен</title>
        </Helmet>
        <Card className={styles.gateCard}>
          <h1>Доступ к административной панели ограничен</h1>
          <p>
            Для управления тарифами, мониторинга воронки и работы с клиентами необходим флаг
            <strong> admin.panel</strong>. Обратитесь к владельцу организации или команде SimplyCRM
            для выдачи прав.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Helmet>
        <title>Административная консоль — SimplyCRM</title>
      </Helmet>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarBadge}>SimplyCRM</span>
          <h1>Admin Workspace</h1>
          <p>Контролируйте тарифы, воронки и здоровье клиентов в едином центре.</p>
        </div>
        <nav className={styles.nav} aria-label="Навигация по секциям админ-панели">
          {NAV_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(styles.navButton, activeSection === item.id && styles.navButtonActive)}
              onClick={() => handleNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarStat}>
            <span>Годовой доход (ARR)</span>
            <strong>{formatCurrency(arrTotal)}</strong>
          </div>
          <div className={styles.sidebarStat}>
            <span>Компаний на расширении</span>
            <strong>{expansionCompanies}</strong>
          </div>
          <div className={styles.sidebarStat}>
            <span>Рисков в работе</span>
            <strong>{atRiskCompanies}</strong>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <p className={styles.breadcrumb}>Администрирование · SimplyCRM</p>
              <h2>
                {`Привет, ${heroName}!`}
                <span className={styles.heroHighlight}>Операционный центр SimplyCRM</span>
              </h2>
              <p className={styles.headerHint}>
                Следите за метриками, продлениями и рисками клиентов в единой панели. Все рабочие блоки
                CRM собраны для оперативной реакции вашей команды.
              </p>
            </div>
            <div className={styles.heroStats}>
              <Card className={styles.headerBadge}>
                <span>Средний health score</span>
                <strong>{averageHealthScore}</strong>
              </Card>
              <Card className={styles.headerBadge}>
                <span>Активных задач</span>
                <strong>{tasksInFlight.length}</strong>
              </Card>
              <Card className={styles.headerBadge}>
                <span>Активных сделок</span>
                <strong>{activeDeals}</strong>
              </Card>
            </div>
          </div>
          <div className={styles.quickActions}>
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={styles.quickAction}
                onClick={() => handleNavigate(action.id)}
              >
                <span className={styles.quickActionIcon}>{action.icon}</span>
                <span className={styles.quickActionBody}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </span>
              </button>
            ))}
          </div>
        </header>

        <section id="overview" className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <h3>Ключевые метрики</h3>
              <p>Отслеживайте рост выручки и вовлечённость клиентов.</p>
            </div>
            {isOverviewLoading ? <span className={styles.sectionHint}>Обновление…</span> : null}
          </div>

          <div className={styles.metricGrid}>
            {(overview?.metrics ?? []).map((metric) => (
              <Card key={metric.id} className={styles.metricCard}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.metricDelta} data-trend={metric.trend ?? 'steady'}>
                  {metric.delta}%{metric.deltaLabel ? ` · ${metric.deltaLabel}` : ''}
                </span>
              </Card>
            ))}
            <Card className={styles.metricCard}>
              <span className={styles.metricLabel}>Годовой доход (ARR)</span>
              <strong className={styles.metricValue}>{formatCurrency(arrTotal)}</strong>
              <span className={styles.metricDelta} data-trend="up">
                +{formatPercent(expansionCompanies * 6.5)} · Апгрейды в работе
              </span>
            </Card>
            <Card className={styles.metricCard}>
              <span className={styles.metricLabel}>Компании в риске</span>
              <strong className={styles.metricValue}>{atRiskCompanies}</strong>
              <span className={styles.metricDelta} data-trend={atRiskCompanies > 0 ? 'down' : 'steady'}>
                {atRiskCompanies > 0 ? 'Назначьте план действий' : 'Все клиенты стабильны'}
              </span>
            </Card>
          </div>

          <div className={styles.planSummary}>
            <Card className={styles.planDistribution}>
              <header>
                <h4>Заполненность тарифов</h4>
                <p>Видимость по всем активным лицензиям и планам.</p>
              </header>
              <div className={styles.distributionList}>
                {(overview?.planDistribution ?? []).map((item) => (
                  <div key={item.planKey} className={styles.distributionRow}>
                    <div className={styles.distributionMeta}>
                      <span>{item.planName}</span>
                      <span>
                        {item.seatsUsed} / {item.seatsTotal} мест
                      </span>
                    </div>
                    <div className={styles.distributionBar}>
                      <div
                        className={styles.distributionFill}
                        style={{ width: `${item.percentage}%`, background: item.color }}
                      />
                    </div>
                    <span className={styles.distributionValue}>{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className={styles.revenueCard}>
              <header>
                <h4>Динамика MRR</h4>
                <p>Прогноз на основе активности и выставленных счетов.</p>
              </header>
              <div className={styles.revenueChart}>
                {(overview?.revenueTrend ?? []).map((point) => (
                  <div key={point.label} className={styles.revenuePoint}>
                    <div className={styles.revenueBar} style={{ height: `${Math.max(16, point.value ? Math.round((point.value / (overview?.revenueTrend?.slice(-1)[0]?.value ?? 1)) * 100) : 0)}%` }} />
                    <span>{point.label}</span>
                  </div>
                ))}
              </div>
              <footer className={styles.revenueFooter}>
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
              </footer>
            </Card>
            <Card className={styles.segmentsCard}>
              <header>
                <h4>Сегменты клиентов</h4>
                <p>Фокусируйтесь на кластерах с наибольшим ARR.</p>
              </header>
              <div className={styles.segmentList}>
                {segmentStats.map((segment) => (
                  <div key={segment.segment} className={styles.segmentItem}>
                    <div>
                      <strong>{segment.segment}</strong>
                      <span>{segment.companies} компаний</span>
                    </div>
                    <span className={styles.segmentArr}>{formatCurrency(segment.arr)}</span>
                  </div>
                ))}
                {segmentStats.length === 0 ? (
                  <div className={styles.emptyState}>Данные по сегментам появятся после загрузки клиентов.</div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className={styles.customerRadar}>
            <Card className={styles.radarCard}>
              <header>
                <h4>Радар продлений</h4>
                <span>{upcomingRenewals.length ? `${upcomingRenewals.length} ближайших` : 'Без срочных продлений'}</span>
              </header>
              <ul>
                {upcomingRenewals.map((company) => (
                  <li key={company.id}>
                    <div>
                      <strong>{company.organization}</strong>
                      <span>{company.planName}</span>
                    </div>
                    <span className={styles.radarMeta}>до {formatDate(company.renewalDate)}</span>
                  </li>
                ))}
                {upcomingRenewals.length === 0 ? (
                  <li className={styles.emptyState}>В ближайшие 45 дней продления не ожидаются.</li>
                ) : null}
              </ul>
            </Card>
            <Card className={styles.radarCard}>
              <header>
                <h4>Пробные на исходе</h4>
                <span>{trialExpiring.length ? `${trialExpiring.length} компаний` : 'Все trial активны'}</span>
              </header>
              <ul>
                {trialExpiring.map((company) => (
                  <li key={company.id}>
                    <div>
                      <strong>{company.organization}</strong>
                      <span>{company.accountOwner}</span>
                    </div>
                    <span className={styles.radarMeta}>заканчивается {formatDate(company.renewalDate)}</span>
                  </li>
                ))}
                {trialExpiring.length === 0 ? (
                  <li className={styles.emptyState}>Все пробные аккаунты ещё активны.</li>
                ) : null}
              </ul>
            </Card>
            <Card className={styles.radarCard}>
              <header>
                <h4>Сигналы риска</h4>
                <span>{criticalSignals.length ? `${criticalSignals.length} сигнала` : 'Сигналов нет'}</span>
              </header>
              <ul>
                {criticalSignals.map((signal) => (
                  <li key={signal.id}>
                    <div>
                      <strong>{signal.company}</strong>
                      <span>{signal.metric}</span>
                    </div>
                    <span className={styles.radarMeta}>{formatDateTime(signal.occurredAt)}</span>
                  </li>
                ))}
                {criticalSignals.length === 0 ? (
                  <li className={styles.emptyState}>Критических сигналов не обнаружено.</li>
                ) : null}
              </ul>
            </Card>
          </div>
        </section>

        <section id="companies" className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <h3>Компании и тарифы</h3>
              <p>Работайте с клиентами, меняйте планы и следите за здоровьем.</p>
            </div>
            <div className={styles.filters}>
              <input
                type="search"
                className={styles.search}
                placeholder="Поиск компании или сегмента"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className={styles.filterGroup}>
                {['all', 'active', 'trialing', 'invited'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(
                      styles.filterChip,
                      statusFilter === value && styles.filterChipActive
                    )}
                    onClick={() => setStatusFilter(value as typeof statusFilter)}
                  >
                    {value === 'all' ? 'Все статусы' : companyStatusLabel[value as AdminUserRecord['status']]}
                  </button>
                ))}
              </div>
              <select
                className={styles.select}
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}
              >
                {planFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.companyLayout}>
            <div className={styles.companyList}>
              {isUsersLoading ? (
                <div className={styles.loadingOverlay}>Загрузка компаний…</div>
              ) : null}
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className={clsx(
                    styles.companyCard,
                    selectedCompanyId === company.id && styles.companyCardActive
                  )}
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  <div className={styles.companyCardHeader}>
                    <span className={styles.companyAvatar} style={{ background: company.avatarColor }}>
                      {company.organization
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </span>
                    <div>
                      <strong>{company.organization}</strong>
                      <span className={styles.companyPlan}>{company.planName}</span>
                    </div>
                  </div>
                  <div className={styles.companyCardBody}>
                    <span className={styles.companyHealth} data-status={company.healthStatus}>
                      {healthLabel[company.healthStatus]}
                    </span>
                    <span className={styles.companyMetric}>{formatCurrency(company.arr)}</span>
                    <span className={styles.companyMetric}>{company.seatsUsed} / {company.seatsTotal}</span>
                  </div>
                  <div className={styles.companyTags}>
                    <span>{company.segment}</span>
                    <span>{lifecycleLabel[company.lifecycleStage]}</span>
                  </div>
                </button>
              ))}
              {filteredCompanies.length === 0 && !isUsersLoading ? (
                <div className={styles.companyEmpty}>Не найдено компаний по указанным фильтрам.</div>
              ) : null}
            </div>

            <div className={styles.companyDetail}>
              {selectedCompany ? (
                <Card className={styles.detailCard}>
                  <header className={styles.detailHeader}>
                    <div>
                      <h4>{selectedCompany.organization}</h4>
                      <span>{selectedCompany.fullName}</span>
                    </div>
                    <div className={styles.detailBadges}>
                      <StatusBadge status={companyStatusLabel[selectedCompany.status]} tone="info" />
                      <StatusBadge status={lifecycleLabel[selectedCompany.lifecycleStage]} tone="success" />
                      <StatusBadge
                        status={healthLabel[selectedCompany.healthStatus]}
                        tone={selectedCompany.healthStatus === 'risk' ? 'warning' : 'success'}
                      />
                    </div>
                  </header>
                  <div className={styles.detailMeta}>
                    <div>
                      <span className={styles.metricLabel}>Тариф</span>
                      <select
                        className={styles.detailSelect}
                        value={selectedPlans[selectedCompany.id] ?? selectedCompany.planKey}
                        onChange={(event) =>
                          setSelectedPlans((prev) => ({
                            ...prev,
                            [selectedCompany.id]: event.target.value
                          }))
                        }
                        disabled={
                          (assignMutation.isPending && assignPendingUserId === selectedCompany.id) ||
                          (revokeMutation.isPending && revokePendingUserId === selectedCompany.id)
                        }
                      >
                        {(plans ?? []).map((plan: AdminPlanOption) => (
                          <option key={plan.key} value={plan.key}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>ARR</span>
                      <strong>{formatCurrency(selectedCompany.arr)}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Лицензии</span>
                      <strong>
                        {selectedCompany.seatsUsed} / {selectedCompany.seatsTotal}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Health score</span>
                      <strong>{selectedCompany.healthScore}</strong>
                    </div>
                  </div>
                  <div className={styles.detailMetaGrid}>
                    <div>
                      <span className={styles.metricLabel}>Аккаунт-менеджер</span>
                      <strong>{selectedCompany.accountOwner}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Регион</span>
                      <strong>{selectedCompany.region} · {selectedCompany.timezone}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Продление</span>
                      <strong>{formatDate(selectedCompany.renewalDate)}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Последнее взаимодействие</span>
                      <strong>{formatDateTime(selectedCompany.lastInteraction)}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Открытые тикеты</span>
                      <strong>{selectedCompany.openTickets}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>CSAT</span>
                      <strong>{selectedCompany.csatScore.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span className={styles.metricLabel}>Adoption score</span>
                      <strong>{selectedCompany.adoptionScore}%</strong>
                    </div>
                  </div>
                  <div className={styles.detailInsights}>
                    <div className={styles.detailInsight}>
                      <span>Вовлечённость</span>
                      <strong>{selectedCompany.adoptionScore}%</strong>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressValue}
                          style={{ width: `${Math.min(selectedCompany.adoptionScore, 100)}%` }}
                        />
                      </div>
                      <span className={styles.detailInsightMeta}>активных пользователей в продукте</span>
                    </div>
                    <div className={styles.detailInsight}>
                      <span>Использование</span>
                      <strong>
                        {selectedCompany.usageTrend >= 0
                          ? `+${selectedCompany.usageTrend}%`
                          : `${selectedCompany.usageTrend}%`}
                      </strong>
                      <span className={styles.detailInsightMeta}>
                        Последний вход {formatDate(selectedCompany.lastActive)}
                      </span>
                    </div>
                    <div className={styles.detailInsight}>
                      <span>Поддержка</span>
                      <strong>{selectedCompany.openTickets} тик.</strong>
                      <span className={styles.detailInsightMeta}>
                        CSAT {selectedCompany.csatScore.toFixed(1)} · {healthLabel[selectedCompany.healthStatus]}
                      </span>
                    </div>
                  </div>
                  {selectedCompany.healthReason ? (
                    <p className={styles.detailNote}>{selectedCompany.healthReason}</p>
                  ) : null}
                  <div className={styles.detailProducts}>
                    {selectedCompany.topProducts.map((product) => (
                      <span key={product}>{product}</span>
                    ))}
                  </div>
                  <div className={styles.detailBoards}>
                    <div className={styles.detailBoard}>
                      <header>
                        <h5>Задачи успеха</h5>
                        <span>
                          {selectedCompanyTasks.length
                            ? `${selectedCompanyTasks.length} в работе`
                            : 'Нет активных задач'}
                        </span>
                      </header>
                      <ul>
                        {selectedCompanyTasks.map((task) => (
                          <li key={task.id}>
                            <div>
                              <strong>{task.title}</strong>
                              <span>
                                до {formatDate(task.dueDate)} · {task.assigneeName}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={styles.inlineAction}
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={completeTaskMutation.isPending}
                            >
                              Выполнено
                            </button>
                          </li>
                        ))}
                        {selectedCompanyTasks.length === 0 ? (
                          <li className={styles.detailBoardEmpty}>Нет открытых задач по этой компании.</li>
                        ) : null}
                      </ul>
                    </div>
                    <div className={styles.detailBoard}>
                      <header>
                        <h5>Сделки в воронке</h5>
                        <span>
                          {selectedCompanyDeals.length
                            ? `${selectedCompanyDeals.length} активных`
                            : 'Нет сделок'}
                        </span>
                      </header>
                      <ul>
                        {selectedCompanyDeals.map((deal) => (
                          <li key={deal.id}>
                            <div>
                              <strong>{deal.plan}</strong>
                              <span>{deal.stageName}</span>
                            </div>
                            <span className={styles.detailBoardMeta}>{formatCurrency(deal.amount)}</span>
                          </li>
                        ))}
                        {selectedCompanyDeals.length === 0 ? (
                          <li className={styles.detailBoardEmpty}>Компания пока не участвует в сделках.</li>
                        ) : null}
                      </ul>
                    </div>
                    <div className={styles.detailBoard}>
                      <header>
                        <h5>Сигналы здоровья</h5>
                        <span>
                          {selectedCompanySignals.length
                            ? `${selectedCompanySignals.length} сигналов`
                            : 'Все спокойно'}
                        </span>
                      </header>
                      <ul>
                        {selectedCompanySignals.map((signal) => (
                          <li key={signal.id}>
                            <div>
                              <strong>{signal.message}</strong>
                              <span>{signal.metric}</span>
                            </div>
                            <button
                              type="button"
                              className={styles.inlineAction}
                              onClick={() => handleDismissSignal(signal.id)}
                              disabled={dismissSignalMutation.isPending}
                            >
                              Скрыть
                            </button>
                          </li>
                        ))}
                        {selectedCompanySignals.length === 0 ? (
                          <li className={styles.detailBoardEmpty}>Рисков по компании не обнаружено.</li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                  <div className={styles.detailActions}>
                    <Button
                      variant="primary"
                      onClick={() => handleAssign(selectedCompany.id)}
                      disabled={assignMutation.isPending && assignPendingUserId === selectedCompany.id}
                    >
                      Назначить тариф
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleRevoke(selectedCompany.id)}
                      disabled={revokeMutation.isPending && revokePendingUserId === selectedCompany.id}
                    >
                      Снять тариф
                    </Button>
                    <Button variant="link" onClick={() => handleNavigate('pipeline')}>
                      Открыть воронку
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className={styles.detailPlaceholder}>
                  Выберите компанию, чтобы увидеть детальную карточку клиента.
                </Card>
              )}
            </div>
          </div>
        </section>

        <section id="pipeline" className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <h3>Воронка расширений</h3>
              <p>Контролируйте сделки по переходу на старшие тарифы и кастомные пакеты.</p>
            </div>
            {isPipelineLoading ? <span className={styles.sectionHint}>Синхронизация…</span> : null}
          </div>
          <div className={styles.pipelineBoard}>
            {(pipeline ?? []).map((lane: AdminPipelineLane) => (
              <Card key={lane.id} className={styles.pipelineColumn}>
                <header className={styles.pipelineHeader}>
                  <div>
                    <h4>{lane.name}</h4>
                    <span>{lane.description}</span>
                  </div>
                  <div className={styles.pipelineStats}>
                    <span>{lane.deals.length} сделок</span>
                    <span>{formatCurrency(lane.totalAmount)}</span>
                    <span>~{lane.avgAgeDays} дн.</span>
                  </div>
                </header>
                <div className={styles.pipelineDeals}>
                  {lane.deals.map((deal: AdminPipelineDeal) => (
                    <article
                      key={deal.id}
                      className={clsx(
                        styles.pipelineDeal,
                        deal.health === 'risk' && styles.pipelineDealRisk,
                        deal.health === 'positive' && styles.pipelineDealPositive
                      )}
                    >
                      <div className={styles.pipelineDealHeader}>
                        <div>
                          <strong>{deal.company}</strong>
                          <span>{deal.plan}</span>
                        </div>
                        <span className={styles.pipelineAmount}>{formatCurrency(deal.amount)}</span>
                      </div>
                      <div className={styles.pipelineDealMeta}>
                        <span>Ответственный: {deal.owner}</span>
                        <span>Вероятность: {deal.probability}%</span>
                        <span>Обновлено: {formatDate(deal.updatedAt)}</span>
                      </div>
                      <p className={styles.pipelineNextStep}>{deal.nextStep}</p>
                      <div className={styles.pipelineActions}>
                        <label htmlFor={`stage-${deal.id}`}>Стадия</label>
                        <select
                          id={`stage-${deal.id}`}
                          className={styles.pipelineSelect}
                          value={deal.stageId}
                          onChange={(event) =>
                            handleMoveDeal(deal, event.target.value as AdminPipelineStageId)
                          }
                          disabled={moveDealMutation.isPending}
                        >
                          {(pipeline ?? []).map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                  {lane.deals.length === 0 ? (
                    <div className={styles.pipelineEmpty}>На этой стадии пока нет сделок.</div>
                  ) : null}
                </div>
              </Card>
            ))}
            {(pipeline ?? []).length === 0 && !isPipelineLoading ? (
              <div className={styles.pipelineEmptyStandalone}>Данные по воронке появятся после синхронизации.</div>
            ) : null}
          </div>
        </section>

        <section id="requests" className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <h3>Запросы на апгрейд</h3>
              <p>Рабочий инбокс клиентов, которые готовы к расширению подписки.</p>
            </div>
            <span className={styles.sectionHint}>
              Новых: {requests?.filter((request) => request.status === 'new').length ?? 0}
            </span>
          </div>
          <div className={styles.requestsGrid}>
            <Card className={styles.requestsList}>
              {isRequestsLoading ? <div className={styles.loadingOverlay}>Синхронизация заявок…</div> : null}
              {sortedRequests.map((request) => (
                <article key={request.id} className={styles.requestCard}>
                  <header>
                    <div>
                      <h4>{request.organization}</h4>
                      <span>{request.contactName} · {request.contactEmail}</span>
                    </div>
                    <StatusBadge status={statusLabel[request.status]} tone={statusTone[request.status]} />
                  </header>
                  <p className={styles.requestMessage}>{request.message}</p>
                  <div className={styles.requestMeta}>
                    <span>Текущий: {request.currentPlan}</span>
                    <span>Запрошен: {request.requestedPlan}</span>
                    <span>Приоритет: {priorityLabel[request.priority]}</span>
                    <span>{formatDateTime(request.submittedAt)}</span>
                  </div>
                  <div className={styles.requestActions}>
                    <Button
                      variant="primary"
                      onClick={() => respondMutation.mutate({ requestId: request.id, status: 'approved' })}
                      disabled={respondMutation.isPending}
                    >
                      Одобрить
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => respondMutation.mutate({ requestId: request.id, status: 'contacted' })}
                      disabled={respondMutation.isPending}
                    >
                      Связались
                    </Button>
                    <button
                      type="button"
                      className={clsx(styles.linkButton, respondMutation.isPending && styles.disabledButton)}
                      onClick={() => respondMutation.mutate({ requestId: request.id, status: 'rejected' })}
                      disabled={respondMutation.isPending}
                    >
                      Отклонить
                    </button>
                  </div>
                </article>
              ))}
              {sortedRequests.length === 0 && !isRequestsLoading ? (
                <div className={styles.emptyState}>Запросов пока нет.</div>
              ) : null}
            </Card>

            <Card className={styles.planShowcase}>
              <header>
                <h4>Витрина тарифов</h4>
                <p>Используйте карточки тарифов в разговорах с клиентами.</p>
              </header>
              <div className={styles.planTiles}>
                {(plans ?? []).map((plan: AdminPlanOption) => (
                  <div
                    key={plan.key}
                    className={clsx(styles.planTile, plan.recommended && styles.planTileRecommended)}
                    style={{ borderColor: plan.highlightColor }}
                  >
                    <div className={styles.planTileHeader} style={{ background: plan.highlightColor }}>
                      <div>
                        <strong>{plan.name}</strong>
                        <span>{plan.pricePerSeat ? `${plan.pricePerSeat.toLocaleString('ru-RU')}₽/место` : '0₽'}</span>
                      </div>
                      {plan.badge ? <span className={styles.planBadge}>{plan.badge}</span> : null}
                    </div>
                    <ul className={styles.planFeatureList}>
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    {plan.recommended ? <span className={styles.planRecommended}>Рекомендуем для растущих команд</span> : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="activity" className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <h3>Активность и события</h3>
              <p>Журнал ключевых изменений тарифов и платежей.</p>
            </div>
          </div>
          <Card className={styles.activityCard}>
            <ul className={styles.activityTimeline}>
              {(activity ?? []).map((item: AdminActivityRecord) => (
                <li key={item.id} className={styles.activityItem} data-tone={item.tone}>
                  <span className={styles.activityIcon}>{item.icon}</span>
                  <div>
                    <div className={styles.activityTitle}>
                      <strong>{item.actor}</strong> {item.action}
                      <span className={styles.activityTarget}>{item.target}</span>
                    </div>
                    <span className={styles.activityMeta}>{formatDateTime(item.timestamp)}</span>
                    {item.description ? (
                      <p className={styles.activityDescription}>{item.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
              {(activity ?? []).length === 0 ? (
                <div className={styles.emptyState}>Активность ещё не записана.</div>
              ) : null}
            </ul>
          </Card>
        </section>
      </main>

      <aside className={styles.secondary}>
        <Card className={styles.secondaryCard}>
          <header className={styles.secondaryHeader}>
            <div>
              <h4>Задачи успеха</h4>
              <span>{tasksInFlight.length} в работе</span>
            </div>
          </header>
          <ul className={styles.taskList}>
            {tasksInFlight.map((task) => (
              <li key={task.id} className={styles.taskItem}>
                <div>
                  <strong>{task.title}</strong>
                  <span className={styles.taskMeta}>
                    {task.company} · до {formatDate(task.dueDate)} · {task.assigneeName}
                  </span>
                  <span className={clsx(styles.taskPriority, styles[`taskPriority_${task.priority}`])}>
                    {task.priority === 'high'
                      ? 'Высокий приоритет'
                      : task.priority === 'medium'
                      ? 'Средний приоритет'
                      : 'Низкий приоритет'}
                  </span>
                </div>
                <div className={styles.taskActions}>
                  <Button
                    variant="primary"
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={completeTaskMutation.isPending}
                  >
                    Выполнено
                  </Button>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => handleSnoozeTask(task.id)}
                    disabled={snoozeTaskMutation.isPending}
                  >
                    Перенести
                  </button>
                </div>
              </li>
            ))}
            {tasksInFlight.length === 0 ? (
              <li className={styles.emptyState}>Все задачи закрыты — отличный результат!</li>
            ) : null}
          </ul>
        </Card>

        <Card className={styles.secondaryCard}>
          <header className={styles.secondaryHeader}>
            <div>
              <h4>Сигналы здоровья</h4>
              <span>{signals?.length ?? 0} сигналов</span>
            </div>
          </header>
          <ul className={styles.signalList}>
            {(signals ?? []).map((signal) => (
              <li key={signal.id} className={styles.signalItem} data-severity={signal.severity}>
                <div>
                  <div className={styles.signalHeader}>
                    <strong>{signal.company}</strong>
                    <StatusBadge status={severityLabel[signal.severity]} tone={severityTone[signal.severity]} />
                  </div>
                  <p>{signal.message}</p>
                  <span className={styles.signalMetric}>{signal.metric}</span>
                  <span className={styles.signalMeta}>{formatDateTime(signal.occurredAt)}</span>
                  <p className={styles.signalRecommendation}>{signal.recommendation}</p>
                </div>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => handleDismissSignal(signal.id)}
                  disabled={dismissSignalMutation.isPending}
                >
                  Скрыть
                </button>
              </li>
            ))}
            {(signals ?? []).length === 0 ? (
              <li className={styles.emptyState}>Сигналы отсутствуют.</li>
            ) : null}
          </ul>
        </Card>

        <Card className={styles.secondaryCard}>
          <header className={styles.secondaryHeader}>
            <div>
              <h4>Команда успеха</h4>
              <span>{team?.length ?? 0} человека</span>
            </div>
          </header>
          <ul className={styles.teamList}>
            {(team ?? []).map((member: AdminTeamMember) => (
              <li key={member.id} className={styles.teamItem}>
                <div className={styles.teamAvatar} style={{ background: member.avatarColor }}>
                  {member.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <span className={styles.teamMeta}>{member.role} · {member.focus}</span>
                </div>
                <StatusBadge status={teamStatusLabel[member.status]} tone={teamStatusTone[member.status]} />
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
};
