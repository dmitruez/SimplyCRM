import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

import styles from './DashboardPage.module.css';
import { Button } from '../components/ui/Button';
import { dashboardApi } from '../api/dashboard';
import { salesApi } from '../api/sales';
import { catalogApi } from '../api/catalog';
import { coreApi } from '../api/core';
import { notificationBus } from '../components/notifications/notificationBus';
import type { DashboardOverview } from '../types/dashboard';
import type { SalesContact, PurchaseRecord, InvoiceRecord, PaymentRecord } from '../types/sales';
import type { CoreUser, OrganizationInviteRecord, UserRoleRecord } from '../types/core';
import type { Product } from '../types/catalog';

const THEME_STORAGE_KEY = 'simplycrm-dashboard-theme';
const INVITES_QUERY_KEY = ['core', 'organization-invites'] as const;

type ThemeMode = 'light' | 'dark';
type SectionKey =
  | 'overview'
  | 'employees'
  | 'roles'
  | 'audit'
  | 'orders'
  | 'payments'
  | 'analytics'
  | 'support';
type StatusTone = 'neutral' | 'warning' | 'success';

type RoleCode = 'admin' | 'manager' | 'analyst' | 'marketer';

interface RoleDefinition {
  code: RoleCode;
  title: string;
  level: string;
  description: string;
  highlights: string[];
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: 'admin',
    title: 'Администратор',
    level: 'Полный доступ',
    description: 'Управляет пользователями, тарифами и аудитом.',
    highlights: ['Создание и удаление ролей', 'Просмотр журналов аудита', 'Настройка тарифов и ограничений']
  },
  {
    code: 'manager',
    title: 'Менеджер продаж',
    level: 'Ограниченный доступ',
    description: 'Ведёт сделки от заявки до оплаты.',
    highlights: ['Работа с заказами и оплатами', 'Контроль статусов клиентов', 'Ведение заметок и задач']
  },
  {
    code: 'analyst',
    title: 'Аналитик',
    level: 'Доступ к отчётам',
    description: 'Отслеживает показатели и строит прогнозы.',
    highlights: ['Просмотр показателей воронки', 'Экспорт данных', 'Отчёты по выручке и конверсии']
  },
  {
    code: 'marketer',
    title: 'Маркетолог',
    level: 'Доступ по необходимости',
    description: 'Следит за источниками лидов и компаниями.',
    highlights: ['Работа с контактами и тегами', 'Загрузка лидов', 'Контроль эффективности кампаний']
  }
];

const ORDER_STATUS_LABELS: Record<string, { title: string; subtitle: string; tone: StatusTone }> = {
  draft: { title: 'Черновики', subtitle: 'ожидают подтверждения', tone: 'neutral' },
  pending: { title: 'Ожидают оплаты', subtitle: 'счета отправлены', tone: 'warning' },
  processing: { title: 'В работе', subtitle: 'готовятся к отгрузке', tone: 'neutral' },
  fulfilled: { title: 'Выполнены', subtitle: 'доставлены клиенту', tone: 'success' }
};

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS);

const PAYMENT_PROVIDERS = ['Stripe', 'ЮKassa', 'CloudPayments', 'Manual'];

const CURRENCIES = ['USD', 'EUR', 'RUB'];

const NAV_ITEMS: { id: SectionKey; label: string; description: string }[] = [
  { id: 'overview', label: 'Обзор', description: 'ключевые цифры' },
  { id: 'employees', label: 'Работники', description: 'команда и приглашения' },
  { id: 'roles', label: 'Роли', description: 'права доступа' },
  { id: 'audit', label: 'Аудит', description: 'действия пользователей' },
  { id: 'orders', label: 'Заказы', description: 'воронка и статусы' },
  { id: 'payments', label: 'Оплаты', description: 'транзакции и счета' },
  { id: 'analytics', label: 'Аналитика', description: 'метрики и прогнозы' },
  { id: 'support', label: 'Поддержка', description: 'инструкции и помощь' }
];

const formatNumber = (value: number | undefined, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('ru-RU', options).format(value ?? 0);

const formatCurrency = (value: number | undefined, currency: string) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value ?? 0);

const resolveUserName = (user: CoreUser | undefined) => {
  if (!user) {
    return 'Неизвестно';
  }
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return user.username;
};

const resolveContactName = (contact: SalesContact | undefined) => {
  if (!contact) {
    return 'Без контакта';
  }
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  if (contact.email) {
    return contact.email;
  }
  return `Контакт #${contact.id}`;
};

const resolveRoleTitle = (role?: string) => {
  if (!role) {
    return 'Без роли';
  }
  const definition = ROLE_DEFINITIONS.find((item) => item.code === role);
  return definition?.title ?? role;
};

const formatInviteDate = (value?: string) => {
  if (!value) {
    return 'Без ограничения';
  }
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return value;
  }
};

const mapOrderStatus = (order: PurchaseRecord) => {
  const status = order.status?.toLowerCase();
  return ORDER_STATUS_LABELS[status] ?? {
    title: order.status || 'В работе',
    subtitle: 'обрабатывается вручную',
    tone: 'neutral' as StatusTone
  };
};

export const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  const { data: overview, isLoading: isOverviewLoading } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview
  });

  const { data: users } = useQuery<CoreUser[]>({
    queryKey: ['core', 'users'],
    queryFn: coreApi.listUsers
  });

  const { data: roles } = useQuery<UserRoleRecord[]>({
    queryKey: ['core', 'roles'],
    queryFn: coreApi.listUserRoles
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<OrganizationInviteRecord[]>({
    queryKey: INVITES_QUERY_KEY,
    queryFn: coreApi.listOrganizationInvites
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['core', 'audit-logs'],
    queryFn: () => coreApi.listAuditLogs(40)
  });

  const { data: contacts } = useQuery<SalesContact[]>({
    queryKey: ['sales', 'contacts'],
    queryFn: salesApi.listContacts
  });

  const { data: orders } = useQuery<PurchaseRecord[]>({
    queryKey: ['sales', 'orders'],
    queryFn: () => salesApi.listPurchases({ page_size: 40 })
  });

  const { data: invoices } = useQuery<InvoiceRecord[]>({
    queryKey: ['sales', 'invoices'],
    queryFn: salesApi.listInvoices
  });

  const { data: payments } = useQuery<PaymentRecord[]>({
    queryKey: ['sales', 'payments'],
    queryFn: salesApi.listPayments
  });

  const { data: catalog } = useQuery<{ results: Product[] }>({
    queryKey: ['catalog', 'dashboard-products'],
    queryFn: () => catalogApi.listProducts({ pageSize: 40 })
  });

  const roleForm = useForm<{ userId: string; role: RoleCode }>({
    defaultValues: { role: 'manager', userId: '' }
  });

  const contactForm = useForm<{ firstName: string; lastName?: string; email?: string; phoneNumber?: string }>({
    defaultValues: { firstName: '', lastName: '', email: '', phoneNumber: '' }
  });

  const orderForm = useForm<{
    contactId: string;
    status: string;
    currency: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>({
    defaultValues: { contactId: '', status: 'pending', currency: 'RUB', variantId: '', quantity: 1, unitPrice: 0 }
  });

  const paymentForm = useForm<{ invoiceId: string; amount: number; provider: string; reference?: string }>({
    defaultValues: { invoiceId: '', amount: 0, provider: PAYMENT_PROVIDERS[0], reference: '' }
  });

  const inviteForm = useForm<{ email: string; role: RoleCode; validDays: number }>({
    defaultValues: { email: '', role: 'manager', validDays: 14 }
  });

  const assignRoleMutation = useMutation({
    mutationFn: coreApi.createUserRole,
    onSuccess: (createdRole) => {
      notificationBus.publish({
        type: 'success',
        title: 'Роль добавлена',
        message: 'Пользователь получил новые права доступа.'
      });
      roleForm.reset({ role: 'manager', userId: '' });
      queryClient.setQueryData<UserRoleRecord[] | undefined>(['core', 'roles'], (current) =>
        current ? [...current, createdRole] : [createdRole]
      );
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось назначить роль',
        message: 'Проверьте данные и попробуйте снова.'
      });
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: coreApi.deleteUserRole,
    onSuccess: (_, roleId) => {
      notificationBus.publish({
        type: 'success',
        title: 'Роль удалена',
        message: 'Права доступа отозваны.'
      });
      queryClient.setQueryData<UserRoleRecord[] | undefined>(['core', 'roles'], (current) =>
        current?.filter((role) => role.id !== roleId)
      );
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось удалить роль',
        message: 'Попробуйте ещё раз или обратитесь к администратору.'
      });
    }
  });

  const createContactMutation = useMutation({
    mutationFn: salesApi.createContact,
    onSuccess: (contact) => {
      notificationBus.publish({
        type: 'success',
        title: 'Контакт сохранён',
        message: `${resolveContactName(contact)} добавлен в CRM.`
      });
      contactForm.reset({ firstName: '', lastName: '', email: '', phoneNumber: '' });
      queryClient.setQueryData<SalesContact[] | undefined>(['sales', 'contacts'], (current) =>
        current ? [contact, ...current] : [contact]
      );
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Контакт не сохранён',
        message: 'Проверьте обязательные поля и попробуйте снова.'
      });
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload: {
      contactId?: number;
      status: string;
      currency: string;
      variantId?: number;
      quantity: number;
      unitPrice: number;
    }) => {
      const order = await salesApi.createOrder({
        contactId: payload.contactId ?? null,
        status: payload.status,
        currency: payload.currency
      });
      if (payload.variantId) {
        await salesApi.createOrderLine({
          orderId: order.id,
          variantId: payload.variantId,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice
        });
      }
      return order;
    },
    onSuccess: (order) => {
      notificationBus.publish({
        type: 'success',
        title: 'Заказ создан',
        message: 'Новый заказ доступен в воронке.'
      });
      orderForm.reset({ contactId: '', status: 'pending', currency: 'RUB', variantId: '', quantity: 1, unitPrice: 0 });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'orders'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось создать заказ',
        message: 'Проверьте данные и попробуйте снова.'
      });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: salesApi.createPayment,
    onSuccess: (payment) => {
      notificationBus.publish({
        type: 'success',
        title: 'Платёж зарегистрирован',
        message: 'Оплата сохранена и отражена в аналитике.'
      });
      paymentForm.reset({ invoiceId: '', amount: 0, provider: PAYMENT_PROVIDERS[0], reference: '' });
      queryClient.invalidateQueries({ queryKey: ['sales', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка оплаты',
        message: 'Не получилось сохранить платёж, попробуйте ещё раз.'
      });
    }
  });

  const createInviteMutation = useMutation({
    mutationFn: coreApi.createOrganizationInvite,
    onSuccess: (invite) => {
      notificationBus.publish({
        type: 'success',
        title: 'Приглашение отправлено',
        message: 'Ссылка готова к отправке сотруднику.'
      });
      inviteForm.reset({ email: '', role: (invite.role as RoleCode) ?? 'manager', validDays: 14 });
      queryClient.setQueryData<OrganizationInviteRecord[] | undefined>(INVITES_QUERY_KEY, (current) =>
        current ? [invite, ...current] : [invite]
      );
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Приглашение не создано',
        message: 'Проверьте адрес электронной почты и попробуйте снова.'
      });
    }
  });

  const deleteInviteMutation = useMutation({
    mutationFn: coreApi.deleteOrganizationInvite,
    onSuccess: (_, inviteId) => {
      notificationBus.publish({
        type: 'success',
        title: 'Приглашение отозвано',
        message: 'Ссылка больше не активна.'
      });
      queryClient.setQueryData<OrganizationInviteRecord[] | undefined>(INVITES_QUERY_KEY, (current) =>
        current?.filter((invite) => invite.id !== inviteId)
      );
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось отозвать приглашение',
        message: 'Повторите попытку или обновите страницу.'
      });
    }
  });

  const userById = useMemo(() => {
    const map = new Map<number, CoreUser>();
    (users ?? []).forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const roleAssignments = useMemo(() => {
    const grouped = new Map<RoleCode, CoreUser[]>();
    (roles ?? []).forEach((assignment) => {
      const roleCode = assignment.role as RoleCode;
      const current = grouped.get(roleCode) ?? [];
      const user = userById.get(assignment.userId);
      if (user) {
        current.push(user);
        grouped.set(roleCode, current);
      }
    });
    return grouped;
  }, [roles, userById]);

  const sortedInvites = useMemo(() => {
    const list = invites ?? [];
    return {
      active: list.filter((invite) => invite.isActive),
      inactive: list.filter((invite) => !invite.isActive)
    };
  }, [invites]);

  const buildInviteLink = useCallback((token: string) => {
    if (typeof window === 'undefined') {
      return `/invite/${token}`;
    }
    return `${window.location.origin}/invite/${token}`;
  }, []);

  const handleCopyInvite = useCallback(
    async (token: string) => {
      const link = buildInviteLink(token);
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
        } else {
          throw new Error('Clipboard API unavailable');
        }
        notificationBus.publish({
          type: 'success',
          title: 'Ссылка скопирована',
          message: 'Отправьте приглашение сотруднику.'
        });
      } catch {
        if (typeof window !== 'undefined') {
          window.prompt('Скопируйте ссылку вручную и поделитесь ею с коллегой:', link);
        }
        notificationBus.publish({
          type: 'info',
          title: 'Ссылка на приглашение',
          message: 'Мы показали ссылку — скопируйте её и отправьте сотруднику.'
        });
      }
    },
    [buildInviteLink]
  );

  const isInviteActionPending = createInviteMutation.isPending || deleteInviteMutation.isPending;

  const productVariants = useMemo(() => {
    const variants: { id: number; name: string }[] = [];
    (catalog?.results ?? []).forEach((product) => {
      product.variants.forEach((variant) => {
        variants.push({ id: variant.id, name: `${product.name} — ${variant.name}` });
      });
    });
    return variants;
  }, [catalog]);

  const ordersByStatus = useMemo(() => {
    const bucket = new Map<string, PurchaseRecord[]>();
    (orders ?? []).forEach((order) => {
      const status = order.status?.toLowerCase() ?? 'processing';
      const collection = bucket.get(status) ?? [];
      collection.push(order);
      bucket.set(status, collection);
    });
    return bucket;
  }, [orders]);

  const currency = overview?.summary.currency ?? 'RUB';

  const highlightMetrics = useMemo(() => {
    if (!overview) {
      return [] as { id: string; label: string; value: string; hint: string }[];
    }
    return [
      {
        id: 'pipeline',
        label: 'Открытые сделки',
        value: formatNumber(overview.summary.openOpportunities),
        hint: `В работе на ${formatCurrency(overview.summary.pipelineTotal, currency)}`
      },
      {
        id: 'orders',
        label: 'Заказы в работе',
        value: formatNumber(overview.summary.pendingOrders),
        hint: `Воронка на ${formatCurrency(overview.summary.ordersTotal, currency)}`
      },
      {
        id: 'payments',
        label: 'Оплаты за месяц',
        value: formatCurrency(overview.summary.paymentsMonth, currency),
        hint: `${overview.summary.invoicesDue} счетов ждут подтверждения`
      }
    ];
  }, [overview, currency]);

  const sidebarStats = useMemo(() => ({
    overdueOrders: overview?.summary.pendingOrders ?? 0,
    invoicesDue: overview?.summary.overdueInvoices ?? 0,
    paymentsWeek: payments?.slice(0, 5).reduce((acc, payment) => acc + (payment.amount ?? 0), 0) ?? 0
  }), [overview, payments]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    if (!('IntersectionObserver' in window)) {
      return undefined;
    }
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveSection(visible.target.id as SectionKey);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.1, 0.3, 0.6] }
    );

    sections.forEach((section) => section && observer.observe(section));
    return () => {
      sections.forEach((section) => section && observer.unobserve(section));
      observer.disconnect();
    };
  }, []);

  const navigateTo = (section: SectionKey) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      const target = document.getElementById(section);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onSubmitRole = roleForm.handleSubmit(({ userId, role }) => {
    const numericUserId = Number.parseInt(userId, 10);
    if (!Number.isFinite(numericUserId)) {
      notificationBus.publish({
        type: 'warning',
        title: 'Выберите пользователя',
        message: 'Нужно выбрать сотрудника для назначения роли.'
      });
      return;
    }
    assignRoleMutation.mutate({ userId: numericUserId, role });
  });

  const onSubmitContact = contactForm.handleSubmit((payload) => {
    if (!payload.firstName.trim()) {
      notificationBus.publish({
        type: 'warning',
        title: 'Введите имя',
        message: 'Имя контакта обязательно.'
      });
      return;
    }
    createContactMutation.mutate({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      phoneNumber: payload.phoneNumber?.trim() || undefined
    });
  });

  const onSubmitOrder = orderForm.handleSubmit((payload) => {
    const numericContactId = payload.contactId ? Number.parseInt(payload.contactId, 10) : undefined;
    const numericVariantId = payload.variantId ? Number.parseInt(payload.variantId, 10) : undefined;
    if (!numericContactId && !numericVariantId) {
      notificationBus.publish({
        type: 'warning',
        title: 'Заполните заказ',
        message: 'Выберите контакт или вариант товара для заказа.'
      });
      return;
    }
    createOrderMutation.mutate({
      contactId: numericContactId,
      status: payload.status,
      currency: payload.currency,
      variantId: numericVariantId,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice
    });
  });

  const onSubmitPayment = paymentForm.handleSubmit((payload) => {
    const invoiceId = Number.parseInt(payload.invoiceId, 10);
    if (!Number.isFinite(invoiceId)) {
      notificationBus.publish({
        type: 'warning',
        title: 'Выберите счёт',
        message: 'Нужно выбрать счёт для регистрации оплаты.'
      });
      return;
    }
    createPaymentMutation.mutate({
      invoiceId,
      amount: payload.amount,
      provider: payload.provider,
      transactionReference: payload.reference?.trim() || undefined
    });
  });

  const onSubmitInvite = inviteForm.handleSubmit((payload) => {
    const email = payload.email.trim();
    const validDays = Number.isFinite(payload.validDays) ? payload.validDays : 0;
    let expiresAt: string | undefined;
    if (validDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + validDays);
      expiresAt = expiry.toISOString();
    }
    createInviteMutation.mutate({
      email: email || undefined,
      role: payload.role,
      expiresAt
    });
  });

  return (
    <>
      <Helmet>
        <title>SimplyCRM — рабочая область</title>
      </Helmet>
      <div className={clsx(styles.page, theme === 'dark' ? styles.dark : styles.light)}>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarBadge}>SimplyCRM</span>
              <h1>Рабочая область</h1>
              <p>Назначайте роли, создавайте заказы, отслеживайте оплату и аудит действий пользователей.</p>
            </div>
            <div className={styles.themeToggle}>
              <div>
                <span className={styles.themeToggleLabel}>{theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}</span>
                <span className={styles.themeToggleHint}>
                  {theme === 'light' ? 'Комфортно при презентациях' : 'Не слепит в тёмной комнате'}
                </span>
              </div>
              <button
                type="button"
                className={clsx(styles.themeSwitch, theme === 'dark' && styles.themeSwitchActive)}
                onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
                aria-pressed={theme === 'dark'}
              >
                <span className={styles.themeSwitchThumb} aria-hidden="true" />
                <span className={styles.themeSwitchLabel}>{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
            </div>
            <nav className={styles.nav}>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={clsx(styles.navButton, activeSection === item.id && styles.navButtonActive)}
                  aria-current={activeSection === item.id ? 'true' : undefined}
                >
                  <span className={styles.navButtonLabel}>{item.label}</span>
                  <span className={styles.navButtonHint}>{item.description}</span>
                </button>
              ))}
            </nav>
            <div className={styles.sidebarFooter}>
              <div className={styles.sidebarStat}>
                <span>Заказы в работе</span>
                <strong>{formatNumber(sidebarStats.overdueOrders)}</strong>
              </div>
              <div className={styles.sidebarStat}>
                <span>Просрочено</span>
                <strong>{formatNumber(sidebarStats.invoicesDue)}</strong>
              </div>
              <div className={styles.sidebarStat}>
                <span>Поступления за неделю</span>
                <strong>{formatCurrency(sidebarStats.paymentsWeek, currency)}</strong>
              </div>
            </div>
          </aside>

          <main className={styles.main}>
            <section id="overview" className={styles.hero}>
              <div className={styles.heroContent}>
                <h2>
                  SimplyCRM
                  <span>Обновлённый интерфейс без сложной автоматики — всё под рукой в одном окне.</span>
                </h2>
                <p>
                  Следите за воронкой, статусами заказов и оплатой в реальном времени. Все действия пользователей фиксируются в
                  журнале аудита, а роли управляются в пару кликов.
                </p>
                <div className={styles.heroActions}>
                  <Button onClick={() => navigateTo('orders')}>Новый заказ</Button>
                  <Button variant="secondary" onClick={() => navigateTo('roles')}>
                    Настроить роли
                  </Button>
                </div>
              </div>
              <div className={styles.heroHighlights}>
                {isOverviewLoading && highlightMetrics.length === 0 ? (
                  <div className={styles.highlightPlaceholder}>Загружаем метрики…</div>
                ) : (
                  highlightMetrics.map((metric) => (
                    <div key={metric.id} className={styles.highlightCard}>
                      <div className={styles.highlightTitle}>
                        <span>{metric.label}</span>
                      </div>
                      <div className={styles.highlightValue}>{metric.value}</div>
                      <p className={styles.highlightHint}>{metric.hint}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="employees" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Работники и приглашения</h3>
                  <span>Следите за командой и делитесь ссылкой для быстрого доступа.</span>
                </div>
              </div>

              <div className={styles.employeesGrid}>
                <article className={styles.employeeCard}>
                  <h4>Текущая команда</h4>
                  <ul className={styles.employeeList}>
                    {(users ?? []).map((user) => (
                      <li key={user.id} className={styles.employeeListItem}>
                        <div className={styles.employeeMeta}>
                          <strong>{resolveUserName(user)}</strong>
                          <span>{user.email}</span>
                        </div>
                        <span className={styles.employeeRole}>
                          {resolveRoleTitle(roles?.find((role) => role.userId === user.id)?.role)}
                        </span>
                      </li>
                    ))}
                    {(users ?? []).length === 0 && (
                      <li className={styles.emptyState}>Сотрудники пока не добавлены.</li>
                    )}
                  </ul>
                </article>

                <article className={styles.employeeCard}>
                  <h4>Пригласить сотрудника</h4>
                  <form onSubmit={onSubmitInvite} className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Email сотрудника</span>
                      <input
                        type="email"
                        placeholder="name@company.com"
                        {...inviteForm.register('email')}
                      />
                    </label>
                    <label className={styles.formField}>
                      <span>Роль после присоединения</span>
                      <select {...inviteForm.register('role')}>
                        {ROLE_DEFINITIONS.map((definition) => (
                          <option key={definition.code} value={definition.code}>
                            {definition.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Срок действия (дней)</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        {...inviteForm.register('validDays', { valueAsNumber: true, min: 0, max: 90 })}
                      />
                      <span className={styles.formFieldHint}>0 — без ограничения по времени.</span>
                    </label>
                    <div className={styles.formActions}>
                      <Button type="submit" disabled={createInviteMutation.isPending}>
                        Отправить приглашение
                      </Button>
                    </div>
                  </form>
                </article>
              </div>

              <div className={styles.inviteList}>
                <div className={styles.inviteListHeader}>
                  <h4>Ссылки на приглашения</h4>
                  <span className={styles.inviteHint}>
                    Активных: {sortedInvites.active.length} · История: {sortedInvites.inactive.length}
                  </span>
                </div>
                {invitesLoading ? <div className={styles.inviteCard}>Загружаем приглашения…</div> : null}
                {sortedInvites.active.length === 0 && !invitesLoading ? (
                  <div className={styles.emptyInvites}>Активных приглашений пока нет.</div>
                ) : (
                  sortedInvites.active.map((invite) => (
                    <div key={invite.id} className={styles.inviteCard}>
                      <header>
                        <div>
                          <strong>{invite.email ?? 'Ссылка без email'}</strong>
                          <span className={styles.inviteStatus}>
                            Роль: {resolveRoleTitle(invite.role)} • Действует до {formatInviteDate(invite.expiresAt)}
                          </span>
                        </div>
                        <div className={styles.inviteActions}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleCopyInvite(invite.token)}
                            disabled={isInviteActionPending}
                          >
                            Скопировать
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => deleteInviteMutation.mutate(invite.id)}
                            disabled={deleteInviteMutation.isPending}
                          >
                            Отозвать
                          </Button>
                        </div>
                      </header>
                      <div className={styles.inviteLink}>{buildInviteLink(invite.token)}</div>
                      <div className={styles.inviteMeta}>
                        Создано: {formatInviteDate(invite.createdAt)}
                        {invite.createdByName ? ` • ${invite.createdByName}` : ''}
                      </div>
                    </div>
                  ))
                )}
                {sortedInvites.inactive.length > 0 ? (
                  <div className={styles.inviteHistory}>
                    <h5>История приглашений</h5>
                    <ul>
                      {sortedInvites.inactive.map((invite) => (
                        <li key={invite.id}>
                          <div>
                            <strong>{invite.email ?? 'Без email'}</strong>
                            <span className={styles.inviteStatus}>
                              {invite.acceptedAt
                                ? `Принято ${formatInviteDate(invite.acceptedAt)}`
                                : 'Приглашение отозвано'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <section id="roles" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Роли и уровни доступа</h3>
                  <span>Назначайте готовые роли и следите за тем, кто что может делать в CRM.</span>
                </div>
              </div>
              <div className={styles.roleGrid}>
                {ROLE_DEFINITIONS.map((definition) => {
                  const assignedUsers = roleAssignments.get(definition.code) ?? [];
                  return (
                    <article key={definition.code} className={styles.roleCard}>
                      <header className={styles.roleHeader}>
                        <strong>{definition.title}</strong>
                        <span className={styles.roleBadge}>{definition.level}</span>
                      </header>
                      <p className={styles.roleDescription}>{definition.description}</p>
                      <ul className={styles.roleHighlights}>
                        {definition.highlights.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <div className={styles.roleAssignments}>
                        <span>Назначено: {assignedUsers.length}</span>
                        {assignedUsers.length > 0 && (
                          <ul>
                            {assignedUsers.map((user) => (
                              <li key={user.id}>{resolveUserName(user)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className={styles.roleForm}>
                <h4>Назначить роль</h4>
                <form onSubmit={onSubmitRole} className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>Сотрудник</span>
                    <select {...roleForm.register('userId')} required>
                      <option value="">Выберите пользователя…</option>
                      {(users ?? []).map((user) => (
                        <option key={user.id} value={user.id}>
                          {resolveUserName(user)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>Роль</span>
                    <select {...roleForm.register('role')} required>
                      {ROLE_DEFINITIONS.map((definition) => (
                        <option key={definition.code} value={definition.code}>
                          {definition.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.formActions}>
                    <Button type="submit" disabled={assignRoleMutation.isPending}>
                      Назначить
                    </Button>
                  </div>
                </form>
                {roles && roles.length > 0 && (
                  <div className={styles.roleTable}>
                    <div className={styles.roleTableHeader}>
                      <span>Пользователь</span>
                      <span>Роль</span>
                      <span>Назначена</span>
                      <span className={styles.visuallyHidden}>Действия</span>
                    </div>
                    <ul>
                      {roles.map((role) => (
                        <li key={role.id} className={styles.roleTableRow}>
                          <span>{resolveUserName(userById.get(role.userId))}</span>
                          <span>{ROLE_DEFINITIONS.find((item) => item.code === role.role)?.title ?? role.role}</span>
                          <span>{new Date(role.assignedAt).toLocaleDateString('ru-RU')}</span>
                          <button
                            type="button"
                            className={styles.roleRemove}
                            onClick={() => removeRoleMutation.mutate(role.id)}
                            disabled={removeRoleMutation.isPending}
                            aria-label="Удалить роль"
                          >
                            Удалить
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section id="audit" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Журнал аудита</h3>
                  <span>Каждое изменение фиксируется и доступно для проверки.</span>
                </div>
              </div>
              <div className={styles.auditTimeline}>
                {(auditLogs ?? []).map((log) => (
                  <article key={log.id} className={styles.auditItem}>
                    <header>
                      <strong>{log.action}</strong>
                      <time dateTime={log.createdAt}>
                        {new Date(log.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </header>
                    <p>{log.entity}</p>
                    <footer>
                      <span>{resolveUserName(userById.get(log.userId ?? undefined))}</span>
                    </footer>
                  </article>
                ))}
                {(auditLogs ?? []).length === 0 && <p className={styles.emptyState}>Пока нет записей аудита.</p>}
              </div>
            </section>

            <section id="orders" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Заказы и статусы</h3>
                  <span>Контролируйте воронку и наполняйте её новыми заказами.</span>
                </div>
              </div>
              <div className={styles.orderBoard}>
                {ORDER_STATUSES.map((statusKey) => {
                  const statusConfig = ORDER_STATUS_LABELS[statusKey];
                  const columnOrders = ordersByStatus.get(statusKey) ?? [];
                  return (
                    <div key={statusKey} className={styles.orderColumn}>
                      <header>
                        <div>
                          <strong>{statusConfig.title}</strong>
                          <span>{statusConfig.subtitle}</span>
                        </div>
                        <span className={clsx(styles.orderBadge, styles[`status${statusConfig.tone.charAt(0).toUpperCase()}${statusConfig.tone.slice(1)}`])}>
                          {columnOrders.length}
                        </span>
                      </header>
                      <ul>
                        {columnOrders.map((order) => (
                          <li key={order.id}>
                            <span>{order.contactName ?? 'Без контакта'}</span>
                            <strong>{formatCurrency(order.totalAmount, order.currency)}</strong>
                            <time dateTime={order.orderedAt ?? undefined}>
                              {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString('ru-RU') : '—'}
                            </time>
                          </li>
                        ))}
                        {columnOrders.length === 0 && <li className={styles.emptyState}>Пока нет заказов</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.panel}>
                  <h4>Новый контакт</h4>
                  <form onSubmit={onSubmitContact} className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Имя *</span>
                      <input type="text" {...contactForm.register('firstName')} required />
                    </label>
                    <label className={styles.formField}>
                      <span>Фамилия</span>
                      <input type="text" {...contactForm.register('lastName')} />
                    </label>
                    <label className={styles.formField}>
                      <span>Email</span>
                      <input type="email" {...contactForm.register('email')} />
                    </label>
                    <label className={styles.formField}>
                      <span>Телефон</span>
                      <input type="tel" {...contactForm.register('phoneNumber')} />
                    </label>
                    <div className={styles.formActions}>
                      <Button type="submit" disabled={createContactMutation.isPending}>
                        Сохранить контакт
                      </Button>
                    </div>
                  </form>
                </article>

                <article className={styles.panel}>
                  <h4>Создать заказ</h4>
                  <form onSubmit={onSubmitOrder} className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Контакт</span>
                      <select {...orderForm.register('contactId')}>
                        <option value="">Без контакта</option>
                        {(contacts ?? []).map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {resolveContactName(contact)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Статус</span>
                      <select {...orderForm.register('status')} required>
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]?.title ?? status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Валюта</span>
                      <select {...orderForm.register('currency')} required>
                        {CURRENCIES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Вариант товара</span>
                      <select {...orderForm.register('variantId')}>
                        <option value="">Без позиции</option>
                        {productVariants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Количество</span>
                      <input type="number" min={1} {...orderForm.register('quantity', { valueAsNumber: true })} />
                    </label>
                    <label className={styles.formField}>
                      <span>Цена за единицу</span>
                      <input type="number" min={0} step={0.01} {...orderForm.register('unitPrice', { valueAsNumber: true })} />
                    </label>
                    <div className={styles.formActions}>
                      <Button type="submit" disabled={createOrderMutation.isPending}>
                        Создать заказ
                      </Button>
                    </div>
                  </form>
                </article>
              </div>
            </section>

            <section id="payments" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Онлайн-оплаты</h3>
                  <span>Контролируйте поступления и фиксируйте платежи.</span>
                </div>
              </div>
              <div className={styles.paymentsPanel}>
                <div className={styles.paymentList}>
                  <h4>Последние платежи</h4>
                  <ul>
                    {(payments ?? []).slice(0, 8).map((payment) => (
                      <li key={payment.id}>
                        <div>
                          <strong>{formatCurrency(payment.amount, currency)}</strong>
                          <span>{payment.provider}</span>
                        </div>
                        <time dateTime={payment.processedAt ?? undefined}>
                          {payment.processedAt ? new Date(payment.processedAt).toLocaleString('ru-RU') : '—'}
                        </time>
                      </li>
                    ))}
                    {(payments ?? []).length === 0 && <li className={styles.emptyState}>Платежей пока нет.</li>}
                  </ul>
                </div>
                <div className={styles.paymentForm}>
                  <h4>Зарегистрировать оплату</h4>
                  <form onSubmit={onSubmitPayment} className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Счёт</span>
                      <select {...paymentForm.register('invoiceId')} required>
                        <option value="">Выберите счёт…</option>
                        {(invoices ?? []).map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            #{invoice.id} — {formatCurrency(invoice.totalAmount, currency)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Сумма</span>
                      <input type="number" min={0} step={0.01} {...paymentForm.register('amount', { valueAsNumber: true })} required />
                    </label>
                    <label className={styles.formField}>
                      <span>Провайдер</span>
                      <select {...paymentForm.register('provider')} required>
                        {PAYMENT_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span>Ссылка / номер</span>
                      <input type="text" {...paymentForm.register('reference')} />
                    </label>
                    <div className={styles.formActions}>
                      <Button type="submit" disabled={createPaymentMutation.isPending}>
                        Сохранить платёж
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </section>

            <section id="analytics" className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <h3>Статистика и аналитика</h3>
                  <span>Минимум цифр — только то, что нужно пользователю.</span>
                </div>
              </div>
              <div className={styles.analyticsGrid}>
                <article className={styles.analyticsCard}>
                  <h4>Воронка сделок</h4>
                  <ul>
                    {(overview?.pipeline ?? []).map((row) => (
                      <li key={`${row.pipeline}-${row.stage}`}>
                        <span>
                          {row.pipeline} → {row.stage}
                        </span>
                        <strong>
                          {formatNumber(row.count)} / {formatCurrency(row.value, currency)}
                        </strong>
                      </li>
                    ))}
                    {(overview?.pipeline ?? []).length === 0 && <li className={styles.emptyState}>Нет активных сделок.</li>}
                  </ul>
                </article>
                <article className={styles.analyticsCard}>
                  <h4>Поставщики и склад</h4>
                  <ul>
                    <li>
                      <span>Активных товаров</span>
                      <strong>{formatNumber(overview?.summary.productsActive)}</strong>
                    </li>
                    <li>
                      <span>Вариантов в каталоге</span>
                      <strong>{formatNumber(overview?.summary.productVariants)}</strong>
                    </li>
                    <li>
                      <span>Поставщиков</span>
                      <strong>{formatNumber(overview?.summary.suppliers)}</strong>
                    </li>
                    <li>
                      <span>Запасов на складе</span>
                      <strong>{formatNumber(overview?.summary.inventoryOnHand)}</strong>
                    </li>
                  </ul>
                </article>
                <article className={styles.analyticsCard}>
                  <h4>Активности</h4>
                  <ul>
                    {(overview?.upcomingActivities ?? []).map((activity) => (
                      <li key={activity.id}>
                        <div>
                          <span>{activity.subject || activity.type}</span>
                          <strong>{activity.owner ?? 'Не назначено'}</strong>
                        </div>
                        <time dateTime={activity.dueAt ?? undefined}>
                          {activity.dueAt ? new Date(activity.dueAt).toLocaleString('ru-RU') : '—'}
                        </time>
                      </li>
                    ))}
                    {(overview?.upcomingActivities ?? []).length === 0 && <li className={styles.emptyState}>Нет запланированных задач.</li>}
                  </ul>
                </article>
              </div>
            </section>

            <section id="support" className={styles.section}>
              <div className={styles.supportCard}>
                <div>
                  <h3>Поддержка команды SimplyCRM</h3>
                  <p>Чат, обучение и готовые шаблоны помогут внедрить CRM без сложных автоматизаций и вебхуков.</p>
                  <ul>
                    <li>Живой чат отвечает в течение 10 минут</li>
                    <li>Видеосессия по запуску и обучению команды</li>
                    <li>Шаблоны отчётов и чек-листы по оплатам</li>
                  </ul>
                </div>
                <Button variant="secondary">Открыть центр помощи</Button>
              </div>
            </section>
          </main>

          <aside className={styles.secondary}>
            <div className={styles.secondaryPanel}>
              <h4>Последние заметки</h4>
              <ul>
                {(overview?.recentNotes ?? []).map((note) => (
                  <li key={note.id}>
                    <p>{note.content}</p>
                    <footer>
                      <span>{note.author ?? 'Без автора'}</span>
                      <time dateTime={note.createdAt}>
                        {new Date(note.createdAt).toLocaleString('ru-RU')}
                      </time>
                    </footer>
                  </li>
                ))}
                {(overview?.recentNotes ?? []).length === 0 && <li className={styles.emptyState}>Заметок пока нет.</li>}
              </ul>
            </div>
            <div className={styles.secondaryPanel}>
              <h4>Отгрузки</h4>
              <ul>
                {(overview?.recentShipments ?? []).map((shipment) => (
                  <li key={shipment.id}>
                    <div>
                      <strong>{shipment.carrier}</strong>
                      <span>{shipment.status}</span>
                    </div>
                    <time dateTime={shipment.shippedAt ?? undefined}>
                      {shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleDateString('ru-RU') : '—'}
                    </time>
                  </li>
                ))}
                {(overview?.recentShipments ?? []).length === 0 && <li className={styles.emptyState}>Отгрузок нет.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};