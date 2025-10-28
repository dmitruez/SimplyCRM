import { notificationBus } from '../components/notifications/notificationBus';
import {
  AdminActivityRecord,
  AdminOverview,
  AdminPipelineDeal,
  AdminPipelineLane,
  AdminPipelineStageId,
  AdminPlanDistribution,
  AdminPlanOption,
  AdminPlanRequest,
  AdminSignal,
  AdminTask,
  AdminTeamMember,
  AdminUserRecord
} from '../types/admin';

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

const clone = <T,>(payload: T): T => JSON.parse(JSON.stringify(payload));

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

const planPriceMap = new Map(planOptions.map((plan) => [plan.key, plan.pricePerSeat]));

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
    arr: 2520000,
    healthScore: 92,
    usageTrend: 14,
    lastActive: '2024-05-09T09:24:00Z',
    avatarColor: '#2563eb',
    tags: ['AI', 'Global'],
    accountOwner: 'Мария Корнеева',
    segment: 'AI & Robotics',
    lifecycleStage: 'expansion',
    renewalDate: '2024-11-01T00:00:00Z',
    lastInteraction: '2024-05-08T14:20:00Z',
    timezone: 'UTC+3',
    region: 'EMEA',
    healthStatus: 'healthy',
    healthReason: 'Высокое вовлечение команды и рост использования AI-модулей.',
    openTickets: 1,
    csatScore: 4.9,
    adoptionScore: 93,
    topProducts: ['Sales Automation', 'Analytics', 'AI Assistant']
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
    arr: 936000,
    healthScore: 81,
    usageTrend: 6,
    lastActive: '2024-05-09T11:02:00Z',
    avatarColor: '#f97316',
    tags: ['Startup'],
    accountOwner: 'Егор Савельев',
    segment: 'AI Startups',
    lifecycleStage: 'onboarding',
    renewalDate: '2024-06-15T00:00:00Z',
    lastInteraction: '2024-05-09T09:55:00Z',
    timezone: 'UTC+7',
    region: 'APAC',
    healthStatus: 'attention',
    healthReason: 'Планируется апгрейд, но вовлечённость ниже среднего.',
    openTickets: 0,
    csatScore: 4.6,
    adoptionScore: 71,
    topProducts: ['CRM', 'Automation']
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
    arr: 5760000,
    healthScore: 88,
    usageTrend: 11,
    lastActive: '2024-05-08T20:48:00Z',
    avatarColor: '#a855f7',
    tags: ['Enterprise', 'Logistics'],
    accountOwner: 'Светлана Морозова',
    segment: 'Enterprise Logistics',
    lifecycleStage: 'expansion',
    renewalDate: '2025-02-01T00:00:00Z',
    lastInteraction: '2024-05-08T16:40:00Z',
    timezone: 'UTC+4',
    region: 'EMEA',
    healthStatus: 'healthy',
    healthReason: 'Работаем над внедрением расширенной аналитики.',
    openTickets: 1,
    csatScore: 4.7,
    adoptionScore: 88,
    topProducts: ['CRM', 'Automation', 'Logistics']
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
    arr: 1944000,
    healthScore: 76,
    usageTrend: -3,
    lastActive: '2024-05-09T06:12:00Z',
    avatarColor: '#0ea5e9',
    tags: ['Retail'],
    accountOwner: 'Ирина Белкина',
    segment: 'Retail & Omnichannel',
    lifecycleStage: 'active',
    renewalDate: '2024-09-20T00:00:00Z',
    lastInteraction: '2024-05-07T12:30:00Z',
    timezone: 'UTC+3',
    region: 'EMEA',
    healthStatus: 'attention',
    healthReason: 'Снижение активности менеджеров на 3% за неделю.',
    openTickets: 3,
    csatScore: 4.4,
    adoptionScore: 74,
    topProducts: ['CRM', 'Commerce']
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
    arr: 0,
    healthScore: 64,
    usageTrend: 9,
    lastActive: '2024-05-05T14:35:00Z',
    avatarColor: '#16a34a',
    tags: ['Design', 'Incubator'],
    accountOwner: 'Михаил Крылов',
    segment: 'Creative Agencies',
    lifecycleStage: 'onboarding',
    renewalDate: '2024-05-28T00:00:00Z',
    lastInteraction: '2024-05-05T15:05:00Z',
    timezone: 'UTC+3',
    region: 'EMEA',
    healthStatus: 'risk',
    healthReason: 'Низкая активность за последние 5 дней.',
    openTickets: 0,
    csatScore: 4,
    adoptionScore: 52,
    topProducts: ['CRM', 'Projects']
  },
  {
    id: 6,
    fullName: 'Григорий Денисов',
    email: 'greg@vectorlabs.dev',
    organization: 'Vector Labs',
    planKey: 'pro',
    planName: 'Pro',
    status: 'active',
    seatsUsed: 18,
    seatsTotal: 20,
    monthlySpend: 126000,
    arr: 1512000,
    healthScore: 79,
    usageTrend: 8,
    lastActive: '2024-05-09T07:45:00Z',
    avatarColor: '#fb7185',
    tags: ['SaaS', 'Product'],
    accountOwner: 'Егор Савельев',
    segment: 'Product SaaS',
    lifecycleStage: 'active',
    renewalDate: '2024-10-10T00:00:00Z',
    lastInteraction: '2024-05-08T11:10:00Z',
    timezone: 'UTC+1',
    region: 'EMEA',
    healthStatus: 'healthy',
    healthReason: 'Регулярное использование автоматизации и аналитики.',
    openTickets: 1,
    csatScore: 4.5,
    adoptionScore: 82,
    topProducts: ['CRM', 'Automation']
  },
  {
    id: 7,
    fullName: 'Марина Лазарева',
    email: 'marina@helios.energy',
    organization: 'Helios Energy Systems',
    planKey: 'enterprise',
    planName: 'Enterprise',
    status: 'active',
    seatsUsed: 52,
    seatsTotal: 60,
    monthlySpend: 360000,
    arr: 4320000,
    healthScore: 90,
    usageTrend: 13,
    lastActive: '2024-05-09T05:55:00Z',
    avatarColor: '#facc15',
    tags: ['Energy', 'Field Service'],
    accountOwner: 'Светлана Морозова',
    segment: 'Energy & Field Service',
    lifecycleStage: 'expansion',
    renewalDate: '2025-01-12T00:00:00Z',
    lastInteraction: '2024-05-08T19:00:00Z',
    timezone: 'UTC+4',
    region: 'EMEA',
    healthStatus: 'healthy',
    healthReason: 'Расширяют использование сервисов и подключают новые команды.',
    openTickets: 0,
    csatScore: 4.8,
    adoptionScore: 90,
    topProducts: ['CRM', 'Automation', 'Field Service']
  },
  {
    id: 8,
    fullName: 'Тимур Алиев',
    email: 'timur@polaranalytics.io',
    organization: 'Polar Analytics',
    planKey: 'free',
    planName: 'Free',
    status: 'trialing',
    seatsUsed: 5,
    seatsTotal: 10,
    monthlySpend: 0,
    arr: 0,
    healthScore: 70,
    usageTrend: -5,
    lastActive: '2024-05-06T18:10:00Z',
    avatarColor: '#06b6d4',
    tags: ['Analytics'],
    accountOwner: 'Мария Корнеева',
    segment: 'Analytics Startups',
    lifecycleStage: 'onboarding',
    renewalDate: '2024-06-05T00:00:00Z',
    lastInteraction: '2024-05-07T10:15:00Z',
    timezone: 'UTC+3',
    region: 'EMEA',
    healthStatus: 'attention',
    healthReason: 'Требуется демо Pro-функций и настройка BI-коннекторов.',
    openTickets: 1,
    csatScore: 4.2,
    adoptionScore: 61,
    topProducts: ['CRM', 'Analytics']
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
  },
  {
    id: 304,
    organization: 'Vector Labs',
    contactName: 'Григорий Денисов',
    contactEmail: 'greg@vectorlabs.dev',
    currentPlan: 'Pro',
    requestedPlan: 'Enterprise',
    message: 'Нужны расширенные роли доступа и аудит логов.',
    submittedAt: '2024-05-08T10:30:00Z',
    priority: 'medium',
    status: 'new'
  },
  {
    id: 305,
    organization: 'Helios Energy Systems',
    contactName: 'Марина Лазарева',
    contactEmail: 'marina@helios.energy',
    currentPlan: 'Enterprise',
    requestedPlan: 'Ultimate',
    message: 'Запрашивают выделенную команду внедрения и расширенный SLA.',
    submittedAt: '2024-05-07T14:18:00Z',
    priority: 'high',
    status: 'contacted'
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
  },
  {
    id: 504,
    timestamp: '2024-05-08T12:14:00Z',
    actor: 'Мария Корнеева',
    action: 'обновила прогноз',
    target: 'Enterprise pipeline',
    tone: 'info',
    icon: '📊',
    description: 'Новый прогноз роста ARR на 12% в Q2.'
  },
  {
    id: 505,
    timestamp: '2024-05-08T09:50:00Z',
    actor: 'Светлана Морозова',
    action: 'создала задачу',
    target: 'Helios Energy Systems',
    tone: 'success',
    icon: '🗓️',
    description: 'Запланирована стратегия расширения на Q3.'
  }
];

const adminTeam: AdminTeamMember[] = [
  {
    id: 1,
    name: 'Мария Корнеева',
    role: 'Head of Enterprise Success',
    avatarColor: '#2563eb',
    focus: 'AI & Analytics',
    status: 'available',
    email: 'maria@simplycrm.io'
  },
  {
    id: 2,
    name: 'Светлана Морозова',
    role: 'Strategic Success Lead',
    avatarColor: '#a855f7',
    focus: 'Energy & Logistics',
    status: 'busy',
    email: 'svetlana@simplycrm.io'
  },
  {
    id: 3,
    name: 'Егор Савельев',
    role: 'Scale Program Manager',
    avatarColor: '#f97316',
    focus: 'SaaS & Startups',
    status: 'available',
    email: 'egor@simplycrm.io'
  },
  {
    id: 4,
    name: 'Михаил Крылов',
    role: 'Onboarding Specialist',
    avatarColor: '#16a34a',
    focus: 'Creative Agencies',
    status: 'offline',
    email: 'mikhail@simplycrm.io'
  }
];

let adminTasks: AdminTask[] = [
  {
    id: 9001,
    title: 'Подготовить предложение по ML-интеграции',
    companyId: 1,
    company: 'Aether Technologies',
    dueDate: '2024-05-10T12:00:00Z',
    createdAt: '2024-05-08T07:20:00Z',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 2,
    assigneeName: 'Светлана Морозова',
    relatedPlan: 'Enterprise'
  },
  {
    id: 9002,
    title: 'Назначить воркшоп по автоматизации',
    companyId: 5,
    company: 'Seed Studio',
    dueDate: '2024-05-11T15:00:00Z',
    createdAt: '2024-05-07T10:12:00Z',
    status: 'pending',
    priority: 'medium',
    assigneeId: 4,
    assigneeName: 'Михаил Крылов',
    relatedPlan: 'Pro'
  },
  {
    id: 9003,
    title: 'Провести QBR с Northwind Retail',
    companyId: 4,
    company: 'Northwind Retail',
    dueDate: '2024-05-14T09:00:00Z',
    createdAt: '2024-05-06T08:30:00Z',
    status: 'pending',
    priority: 'high',
    assigneeId: 1,
    assigneeName: 'Мария Корнеева',
    relatedPlan: 'Pro'
  },
  {
    id: 9004,
    title: 'Согласовать SLA для Helios Energy',
    companyId: 7,
    company: 'Helios Energy Systems',
    dueDate: '2024-05-12T18:00:00Z',
    createdAt: '2024-05-08T13:45:00Z',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 2,
    assigneeName: 'Светлана Морозова',
    relatedPlan: 'Ultimate'
  }
];

let adminSignals: AdminSignal[] = [
  {
    id: 1201,
    companyId: 4,
    company: 'Northwind Retail',
    severity: 'warning',
    message: 'Снижение вовлечённости менеджеров',
    metric: 'Активных пользователей -3% за неделю',
    recommendation: 'Назначить стратегическую сессию и обновить плейбуки продаж.',
    occurredAt: '2024-05-09T08:00:00Z'
  },
  {
    id: 1202,
    companyId: 5,
    company: 'Seed Studio',
    severity: 'danger',
    message: 'Риск оттока в течение 14 дней',
    metric: 'Нет входов в систему 48 часов',
    recommendation: 'Организовать совместный запуск автоматизаций и назначить наставника.',
    occurredAt: '2024-05-08T17:40:00Z'
  },
  {
    id: 1203,
    companyId: 8,
    company: 'Polar Analytics',
    severity: 'info',
    message: 'Запросили консультацию по BI-коннекторам',
    metric: '3 обращения в поддержку за сутки',
    recommendation: 'Предложить пакет Pro и подготовить демонстрацию интеграций.',
    occurredAt: '2024-05-09T10:25:00Z'
  }
];

const pipelineStages = [
  {
    id: 'qualification',
    name: 'Квалификация',
    description: 'Первичный контакт и профиль клиента.',
    probability: 20,
    order: 0
  },
  {
    id: 'discovery',
    name: 'Диагностика',
    description: 'Интервью, выявление потребностей и дорожная карта.',
    probability: 35,
    order: 1
  },
  {
    id: 'proposal',
    name: 'Коммерческое предложение',
    description: 'Подготовка ROI-модели и кастомного предложения.',
    probability: 55,
    order: 2
  },
  {
    id: 'negotiation',
    name: 'Переговоры',
    description: 'Согласование условий, юридический аудит и SLA.',
    probability: 75,
    order: 3
  },
  {
    id: 'closed',
    name: 'Завершено',
    description: 'Подписание договора и запуск расширений.',
    probability: 100,
    order: 4
  }
] as const;

const pipelineStageMap = new Map(pipelineStages.map((stage) => [stage.id, stage]));

let pipelineDeals: AdminPipelineDeal[] = [
  {
    id: 7001,
    companyId: 6,
    company: 'Vector Labs',
    plan: 'Enterprise',
    amount: 1860000,
    stageId: 'proposal',
    probability: 65,
    owner: 'Егор Савельев',
    updatedAt: '2024-05-08T15:00:00Z',
    nextStep: 'Воркшоп по API 10 мая',
    health: 'positive'
  },
  {
    id: 7002,
    companyId: 2,
    company: 'Novus AI Labs',
    plan: 'Enterprise',
    amount: 1248000,
    stageId: 'discovery',
    probability: 35,
    owner: 'Егор Савельев',
    updatedAt: '2024-05-09T09:30:00Z',
    nextStep: 'Подготовить демо автоматизации',
    health: 'neutral'
  },
  {
    id: 7003,
    companyId: 7,
    company: 'Helios Energy Systems',
    plan: 'Ultimate',
    amount: 5280000,
    stageId: 'negotiation',
    probability: 80,
    owner: 'Светлана Морозова',
    updatedAt: '2024-05-08T21:15:00Z',
    nextStep: 'Финализировать SLA до 12 мая',
    health: 'positive'
  },
  {
    id: 7004,
    companyId: 8,
    company: 'Polar Analytics',
    plan: 'Pro',
    amount: 492000,
    stageId: 'qualification',
    probability: 20,
    owner: 'Мария Корнеева',
    updatedAt: '2024-05-07T10:45:00Z',
    nextStep: 'Отправить расширенную презентацию',
    health: 'neutral'
  },
  {
    id: 7005,
    companyId: 5,
    company: 'Seed Studio',
    plan: 'Pro',
    amount: 298800,
    stageId: 'discovery',
    probability: 30,
    owner: 'Михаил Крылов',
    updatedAt: '2024-05-06T09:15:00Z',
    nextStep: 'Назначить воркшоп по автоматизации',
    health: 'risk'
  },
  {
    id: 7006,
    companyId: 4,
    company: 'Northwind Retail',
    plan: 'Ultimate',
    amount: 2784000,
    stageId: 'proposal',
    probability: 60,
    owner: 'Ирина Белкина',
    updatedAt: '2024-05-09T07:05:00Z',
    nextStep: 'Проверить юридический аудит',
    health: 'risk'
  },
  {
    id: 7007,
    companyId: 1,
    company: 'Aether Technologies',
    plan: 'Ultimate',
    amount: 3672000,
    stageId: 'closed',
    probability: 100,
    owner: 'Светлана Морозова',
    updatedAt: '2024-05-04T11:20:00Z',
    nextStep: 'Запустить расширенный AI модуль',
    health: 'positive'
  }
];

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
      {
        id: 'mrr',
        label: 'Ежемесячный доход (MRR)',
        value: formatCurrency(mrr),
        delta: 8.4,
        deltaLabel: 'к прошлому месяцу',
        trend: 'up'
      },
      {
        id: 'active-users',
        label: 'Активных компаний',
        value: `${activeUsers}`,
        delta: 4.1,
        deltaLabel: 'новых за неделю',
        trend: 'up'
      },
      {
        id: 'enterprise-share',
        label: 'Enterprise доля',
        value: `${enterpriseShare}%`,
        delta: 1.6,
        deltaLabel: 'в росте доли',
        trend: 'up'
      },
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

const computePipelineLanes = (): AdminPipelineLane[] =>
  pipelineStages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stage) => {
      const deals = pipelineDeals
        .filter((deal) => deal.stageId === stage.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const totalAmount = deals.reduce((acc, deal) => acc + deal.amount, 0);
      const avgAgeDays =
        deals.length === 0
          ? 0
          : Math.max(
              1,
              Math.round(
                deals.reduce(
                  (acc, deal) =>
                    acc +
                    (Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
                  0
                ) / deals.length
              )
            );

      return {
        ...stage,
        deals,
        totalAmount,
        avgAgeDays
      };
    });

const resolvePlanName = (planKey: string) => planOptions.find((plan) => plan.key === planKey)?.name ?? planKey;

const resolvePlanPrice = (planKey: string) => planPriceMap.get(planKey) ?? 0;

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
    const pricePerSeat = resolvePlanPrice(payload.planKey);
    userRecords = userRecords.map((user) =>
      user.id === payload.userId
        ? {
            ...user,
            planKey: payload.planKey,
            planName,
            monthlySpend: Math.round(pricePerSeat * user.seatsUsed),
            arr: Math.round(pricePerSeat * user.seatsUsed * 12),
            status: user.status === 'invited' ? 'active' : user.status,
            tags: Array.from(new Set([...user.tags.filter((tag) => tag !== user.planName), planName]))
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
            arr: 0,
            status: 'trialing',
            tags: Array.from(new Set([...user.tags.filter((tag) => tag !== user.planName), 'Free']))
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

    const actionMap: Record<
      typeof payload.status,
      { title: string; message: string; type: 'success' | 'warning' | 'info' }
    > = {
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
  },

  async listPipeline(): Promise<AdminPipelineLane[]> {
    await delay();
    return clone(computePipelineLanes());
  },

  async moveDealToStage(payload: { dealId: number; stageId: AdminPipelineStageId }): Promise<AdminPipelineDeal> {
    await delay();
    if (!pipelineStageMap.has(payload.stageId)) {
      throw new Error('Стадия не найдена');
    }

    pipelineDeals = pipelineDeals.map((deal) =>
      deal.id === payload.dealId
        ? {
            ...deal,
            stageId: payload.stageId,
            probability: pipelineStageMap.get(payload.stageId)?.probability ?? deal.probability,
            updatedAt: new Date().toISOString()
          }
        : deal
    );

    const updatedDeal = pipelineDeals.find((deal) => deal.id === payload.dealId);
    if (!updatedDeal) {
      throw new Error('Сделка не найдена');
    }

    notificationBus.publish({
      type: 'success',
      title: 'Сделка обновлена',
      message: `${updatedDeal.company} → ${pipelineStageMap.get(payload.stageId)?.name}`
    });

    return clone(updatedDeal);
  },

  async listTasks(): Promise<AdminTask[]> {
    await delay();
    return clone(adminTasks);
  },

  async completeTask(taskId: number): Promise<AdminTask> {
    await delay();
    adminTasks = adminTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'done'
          }
        : task
    );

    const updatedTask = adminTasks.find((task) => task.id === taskId);
    if (!updatedTask) {
      throw new Error('Задача не найдена');
    }

    notificationBus.publish({
      type: 'success',
      title: 'Задача выполнена',
      message: `${updatedTask.company}: ${updatedTask.title}`
    });

    return clone(updatedTask);
  },

  async snoozeTask(payload: { taskId: number; days?: number }): Promise<AdminTask> {
    await delay();
    const shiftDays = payload.days ?? 2;

    adminTasks = adminTasks.map((task) => {
      if (task.id !== payload.taskId) {
        return task;
      }

      const nextDue = new Date(task.dueDate);
      nextDue.setDate(nextDue.getDate() + shiftDays);

      return {
        ...task,
        dueDate: nextDue.toISOString(),
        status: task.status === 'done' ? 'done' : 'in_progress'
      };
    });

    const updatedTask = adminTasks.find((task) => task.id === payload.taskId);
    if (!updatedTask) {
      throw new Error('Задача не найдена');
    }

    notificationBus.publish({
      type: 'info',
      title: 'Задача перенесена',
      message: `${updatedTask.company}: новая дата ${new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short'
      }).format(new Date(updatedTask.dueDate))}`
    });

    return clone(updatedTask);
  },

  async listSignals(): Promise<AdminSignal[]> {
    await delay();
    return clone(adminSignals);
  },

  async dismissSignal(signalId: number): Promise<number> {
    await delay();
    const removed = adminSignals.find((signal) => signal.id === signalId);
    adminSignals = adminSignals.filter((signal) => signal.id !== signalId);

    if (!removed) {
      throw new Error('Сигнал не найден');
    }

    notificationBus.publish({
      type: 'info',
      title: 'Сигнал скрыт',
      message: `${removed.company}: ${removed.message}`
    });

    return signalId;
  },

  async listTeam(): Promise<AdminTeamMember[]> {
    await delay();
    return clone(adminTeam);
  }
};
