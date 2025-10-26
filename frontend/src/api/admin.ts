import { notificationBus } from '../components/notifications/notificationBus';
import {
  AdminActivityRecord,
  AdminOverview,
  AdminPlanDistribution,
  AdminPlanOption,
  AdminPlanRequest,
  AdminUserRecord
} from '../types/admin';

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

const planPalette = {
  free: '#dbeafe',
  pro: '#bfdbfe',
  enterprise: '#c7d2fe',
  ultimate: '#e9d5ff'
} as const;

const planOptions: AdminPlanOption[] = [
  {
    key: 'free',
    name: 'Free',
    pricePerSeat: 0,
    description: 'Бесплатный старт для тестирования SimplyCRM.',
    highlightColor: planPalette.free,
    features: ['1 рабочее пространство', 'CRM-воронка до 3 стадий', 'История активностей 30 дней']
  },
  {
    key: 'pro',
    name: 'Pro',
    pricePerSeat: 2490,
    description: 'Продвинутая автоматизация процессов для растущих команд.',
    highlightColor: planPalette.pro,
    recommended: true,
    badge: 'Хит',
    features: ['Полноценный каталог и склад', 'Продвинутые отчёты и прогнозы', 'Автоматизация и вебхуки']
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    pricePerSeat: 5490,
    description: 'Расширенные SLA, безопасность и AI-инструменты.',
    highlightColor: planPalette.enterprise,
    features: ['Глубокая аналитика и ML-инсайты', 'Гибкая сегментация клиентов', 'Ролевая модель доступа']
  },
  {
    key: 'ultimate',
    name: 'Ultimate',
    pricePerSeat: 7990,
    description: 'Максимальная кастомизация, выделенная команда и MLOps.',
    highlightColor: planPalette.ultimate,
    badge: 'VIP',
    features: ['Выделенная поддержка 24/7', 'Расширенный AI-ассистент', 'Безлимитные интеграции и аудит']
  }
];

let userRecords: AdminUserRecord[] = [
  {
    id: 1,
    fullName: 'Анна Карпова',
    email: 'anna@aether.dev',
    organization: 'Aether Technologies',
    planKey: 'enterprise',
    planName: 'Enterprise',
    status: 'active',
    seatsUsed: 38,
    seatsTotal: 45,
    monthlySpend: 210000,
    healthScore: 92,
    usageTrend: 14,
    lastActive: '2024-05-09T09:24:00Z',
    avatarColor: '#2563eb',
    tags: ['AI', 'Global']
  },
  {
    id: 2,
    fullName: 'Максим Орлов',
    email: 'max@novus.ai',
    organization: 'Novus AI Labs',
    planKey: 'pro',
    planName: 'Pro',
    status: 'trialing',
    seatsUsed: 12,
    seatsTotal: 15,
    monthlySpend: 78000,
    healthScore: 81,
    usageTrend: 6,
    lastActive: '2024-05-09T11:02:00Z',
    avatarColor: '#f97316',
    tags: ['Startup']
  },
  {
    id: 3,
    fullName: 'Дарья Соколова',
    email: 'daria@aurora.global',
    organization: 'Aurora Logistics',
    planKey: 'ultimate',
    planName: 'Ultimate',
    status: 'active',
    seatsUsed: 64,
    seatsTotal: 80,
    monthlySpend: 480000,
    healthScore: 88,
    usageTrend: 11,
    lastActive: '2024-05-08T20:48:00Z',
    avatarColor: '#a855f7',
    tags: ['Enterprise', 'Logistics']
  },
  {
    id: 4,
    fullName: 'Илья Захаров',
    email: 'ilya@northwind.io',
    organization: 'Northwind Retail',
    planKey: 'pro',
    planName: 'Pro',
    status: 'active',
    seatsUsed: 25,
    seatsTotal: 30,
    monthlySpend: 162000,
    healthScore: 76,
    usageTrend: -3,
    lastActive: '2024-05-09T06:12:00Z',
    avatarColor: '#0ea5e9',
    tags: ['Retail']
  },
  {
    id: 5,
    fullName: 'Ольга Лебедева',
    email: 'olga@seedstudio.io',
    organization: 'Seed Studio',
    planKey: 'free',
    planName: 'Free',
    status: 'invited',
    seatsUsed: 3,
    seatsTotal: 5,
    monthlySpend: 0,
    healthScore: 64,
    usageTrend: 9,
    lastActive: '2024-05-05T14:35:00Z',
    avatarColor: '#16a34a',
    tags: ['Design', 'Incubator']
  }
];

let planRequests: AdminPlanRequest[] = [
  {
    id: 301,
    organization: 'Mercury Fintech',
    contactName: 'Екатерина Фролова',
    contactEmail: 'kate@mercury.finance',
    currentPlan: 'Pro',
    requestedPlan: 'Enterprise',
    message: 'Нужна поддержка SSO и расширенный SLA на 99,9% uptime.',
    submittedAt: '2024-05-08T17:20:00Z',
    priority: 'high',
    status: 'new'
  },
  {
    id: 302,
    organization: 'Atlas Manufacturing',
    contactName: 'Роман Смирнов',
    contactEmail: 'roman@atlasmfg.co',
    currentPlan: 'Pro',
    requestedPlan: 'Ultimate',
    message: 'Планируем объединить 4 филиала в единой CRM, нужен кастомный onboarding.',
    submittedAt: '2024-05-07T09:45:00Z',
    priority: 'medium',
    status: 'contacted'
  },
  {
    id: 303,
    organization: 'Velocity Commerce',
    contactName: 'Светлана Белова',
    contactEmail: 'svetlana@velocity.store',
    currentPlan: 'Free',
    requestedPlan: 'Pro',
    message: 'Хотим открыть оплату онлайн и автоматизацию заказов.',
    submittedAt: '2024-05-06T13:10:00Z',
    priority: 'low',
    status: 'new'
  }
];

const activityLog: AdminActivityRecord[] = [
  {
    id: 501,
    timestamp: '2024-05-09T09:12:00Z',
    actor: 'Анна Карпова',
    action: 'назначила тариф',
    target: 'Novus AI Labs',
    tone: 'success',
    icon: '✨',
    description: 'Обновление плана на Enterprise c 30 лицензиями.'
  },
  {
    id: 502,
    timestamp: '2024-05-09T08:40:00Z',
    actor: 'Система биллинга',
    action: 'зафиксировала оплату',
    target: 'Northwind Retail',
    tone: 'info',
    icon: '💳',
    description: 'Поступил платеж за 25 лицензий Pro.'
  },
  {
    id: 503,
    timestamp: '2024-05-08T18:05:00Z',
    actor: 'Максим Орлов',
    action: 'запросил апгрейд',
    target: 'Novus AI Labs',
    tone: 'warning',
    icon: '📩',
    description: 'Требуется консультация по мультивалютной поддержке.'
  }
];

const clone = <T,>(payload: T): T => JSON.parse(JSON.stringify(payload));

const computePlanDistribution = (): AdminPlanDistribution[] => {
  const totals: Record<string, { seats: number; totalSeats: number }> = {};
  userRecords.forEach((user) => {
    if (!totals[user.planKey]) {
      totals[user.planKey] = { seats: 0, totalSeats: 0 };
    }
    totals[user.planKey].seats += user.seatsUsed;
    totals[user.planKey].totalSeats += user.seatsTotal;
  });

  const distribution = Object.entries(totals).map(([planKey, value]) => {
    const plan = planOptions.find((item) => item.key === planKey);
    return {
      planKey,
      planName: plan?.name ?? planKey,
      percentage: value.totalSeats === 0 ? 0 : Math.min(100, Math.round((value.seats / value.totalSeats) * 100)),
      seatsUsed: value.seats,
      seatsTotal: value.totalSeats,
      color: plan?.highlightColor ?? '#e0e7ff'
    };
  });

  return distribution.sort((a, b) => b.seatsUsed - a.seatsUsed);
};

const computeOverview = (): AdminOverview => {
  const mrr = userRecords.reduce((acc, user) => acc + user.monthlySpend, 0);
  const activeUsers = userRecords.filter((user) => user.status === 'active').length;
  const enterpriseShare = Math.round(
    (userRecords.filter((user) => user.planKey === 'enterprise' || user.planKey === 'ultimate').length / userRecords.length) *
      100
  );
  return {
    metrics: [
      { id: 'mrr', label: 'Ежемесячный доход (MRR)', value: formatCurrency(mrr), delta: 8.4, deltaLabel: 'к прошлому месяцу', trend: 'up' },
      { id: 'active-users', label: 'Активных компаний', value: `${activeUsers}`, delta: 4.1, deltaLabel: 'новых за неделю', trend: 'up' },
      { id: 'enterprise-share', label: 'Enterprise доля', value: `${enterpriseShare}%`, delta: 1.6, deltaLabel: 'в росте доли', trend: 'up' },
      { id: 'nps', label: 'NPS', value: '67', delta: 3.2, deltaLabel: 'за квартал', trend: 'up' }
    ],
    planDistribution: computePlanDistribution(),
    revenueTrend: [
      { label: 'Янв', value: mrr * 0.68 },
      { label: 'Фев', value: mrr * 0.72 },
      { label: 'Мар', value: mrr * 0.83 },
      { label: 'Апр', value: mrr * 0.92 },
      { label: 'Май', value: mrr }
    ],
    satisfactionScore: 4.6,
    retentionRate: 93,
    nps: 67
  };
};

const resolvePlanName = (planKey: string) => planOptions.find((plan) => plan.key === planKey)?.name ?? planKey;

export const adminApi = {
  async getOverview(): Promise<AdminOverview> {
    await delay();
    return clone(computeOverview());
  },

  async listUsers(): Promise<AdminUserRecord[]> {
    await delay();
    return clone(userRecords);
  },

  async listPlans(): Promise<AdminPlanOption[]> {
    await delay();
    return clone(planOptions);
  },

  async assignPlan(payload: { userId: number; planKey: string }): Promise<AdminUserRecord> {
    await delay();
    const planName = resolvePlanName(payload.planKey);
    userRecords = userRecords.map((user) =>
      user.id === payload.userId
        ? {
            ...user,
            planKey: payload.planKey,
            planName,
            monthlySpend: Math.round(planOptions.find((plan) => plan.key === payload.planKey)?.pricePerSeat ?? 0) * user.seatsUsed,
            status: user.status === 'invited' ? 'active' : user.status,
            tags: Array.from(new Set([...user.tags, planName]))
          }
        : user
    );

    const updatedUser = userRecords.find((user) => user.id === payload.userId);
    if (!updatedUser) {
      throw new Error('Пользователь не найден');
    }

    notificationBus.publish({
      type: 'success',
      title: 'Тариф обновлён',
      message: `${updatedUser.organization} переведены на план ${planName}`
    });

    return clone(updatedUser);
  },

  async revokePlan(userId: number): Promise<AdminUserRecord> {
    await delay();
    userRecords = userRecords.map((user) =>
      user.id === userId
        ? {
            ...user,
            planKey: 'free',
            planName: 'Free',
            monthlySpend: 0,
            status: 'trialing'
          }
        : user
    );

    const updatedUser = userRecords.find((user) => user.id === userId);
    if (!updatedUser) {
      throw new Error('Пользователь не найден');
    }

    notificationBus.publish({
      type: 'info',
      title: 'Тариф снят',
      message: `${updatedUser.organization} возвращены на Free план`
    });

    return clone(updatedUser);
  },

  async listPlanRequests(): Promise<AdminPlanRequest[]> {
    await delay();
    return clone(planRequests);
  },

  async respondToRequest(payload: { requestId: number; status: 'approved' | 'rejected' | 'contacted' }): Promise<AdminPlanRequest> {
    await delay();
    planRequests = planRequests.map((request) =>
      request.id === payload.requestId
        ? {
            ...request,
            status: payload.status
          }
        : request
    );

    const updated = planRequests.find((request) => request.id === payload.requestId);
    if (!updated) {
      throw new Error('Заявка не найдена');
    }

    const actionMap: Record<typeof payload.status, { title: string; message: string; type: 'success' | 'warning' | 'info' }> = {
      approved: {
        title: 'Запрос утверждён',
        message: `${updated.organization} получили доступ к плану ${updated.requestedPlan}`,
        type: 'success'
      },
      rejected: {
        title: 'Запрос отклонён',
        message: `${updated.organization}: отметили запрос как отклонённый`,
        type: 'warning'
      },
      contacted: {
        title: 'Связались с клиентом',
        message: `${updated.organization}: назначена консультация`,
        type: 'info'
      }
    };

    notificationBus.publish(actionMap[payload.status]);

    return clone(updated);
  },

  async listActivity(): Promise<AdminActivityRecord[]> {
    await delay();
    return clone(activityLog);
  }
};
