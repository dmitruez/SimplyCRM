import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import clsx from 'clsx';

import styles from './DashboardPage.module.css';
import { Button } from '../components/ui/Button';

interface NavItem {
  id: SectionKey;
  label: string;
  description: string;
}

type SectionKey =
  | 'overview'
  | 'roles'
  | 'audit'
  | 'orders'
  | 'payments'
  | 'analytics'
  | 'support';

type StatusTone = 'neutral' | 'warning' | 'success';
type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'simplycrm-dashboard-theme';

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Обзор', description: 'главная панель' },
  { id: 'roles', label: 'Роли и доступ', description: 'правила и фичи' },
  { id: 'audit', label: 'Аудит', description: 'лог действий' },
  { id: 'orders', label: 'Заказы', description: 'воронка и статусы' },
  { id: 'payments', label: 'Оплаты', description: 'транзакции' },
  { id: 'analytics', label: 'Аналитика', description: 'показатели' },
  { id: 'support', label: 'Поддержка', description: 'чек-листы' }
];

interface HighlightMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
}

const HIGHLIGHT_METRICS: HighlightMetric[] = [
  {
    id: 'clients',
    label: 'Активные клиенты',
    value: '128',
    hint: 'Рост на 12% за месяц'
  },
  {
    id: 'orders',
    label: 'Заказы в работе',
    value: '42',
    hint: '12 ожидают оплаты, 8 к выдаче'
  },
  {
    id: 'revenue',
    label: 'Выручка месяца',
    value: '2.8 млн ₽',
    hint: 'Оплачено 86% выставленных счетов'
  }
];

interface RoleCard {
  role: string;
  purpose: string;
  level: 'Полный доступ' | 'Ограниченный доступ' | 'Только чтение';
  permissions: string[];
  featureFlags: string[];
}

const ROLE_MATRIX: RoleCard[] = [
  {
    role: 'Менеджер продаж',
    purpose: 'Ведёт сделки от заявки до оплаты',
    level: 'Ограниченный доступ',
    permissions: [
      'Создание и обновление сделок',
      'Назначение ответственных',
      'Просмотр аналитики по своим клиентам'
    ],
    featureFlags: ['sales.pipeline', 'sales.order_management', 'analytics.standard']
  },
  {
    role: 'Финансовый контролёр',
    purpose: 'Отвечает за оплату и акты',
    level: 'Полный доступ',
    permissions: [
      'Выставление счетов и актов',
      'Подтверждение поступлений',
      'Возвраты и комментарии по оплатам'
    ],
    featureFlags: ['billing.invoices', 'billing.payments', 'compliance.audit']
  },
  {
    role: 'Операционный менеджер',
    purpose: 'Следит за выполнением заказов',
    level: 'Ограниченный доступ',
    permissions: [
      'Назначение задач исполнителям',
      'Отслеживание готовности',
      'Автопереход статусов без скриптов'
    ],
    featureFlags: ['fulfilment.tasks', 'orders.timeline', 'notifications.inapp']
  },
  {
    role: 'Наблюдатель',
    purpose: 'Отслеживает прогресс и отчёты',
    level: 'Только чтение',
    permissions: ['Просмотр заказов и оплат', 'Доступ к сводной аналитике'],
    featureFlags: ['analytics.overview']
  }
];

interface AuditRecord {
  id: string;
  event: string;
  actor: string;
  target: string;
  timestamp: string;
  detail: string;
}

const AUDIT_LOG: AuditRecord[] = [
  {
    id: '1',
    event: 'Создана роль «Финансовый контролёр»',
    actor: 'Ирина Власова',
    target: 'Организация «Сфера»',
    timestamp: 'Сегодня, 09:15',
    detail: 'Добавлены права на оплату и аудит'
  },
  {
    id: '2',
    event: 'Подтверждён платёж по заказу #542',
    actor: 'Павел Щукин',
    target: 'Счёт INV-542',
    timestamp: 'Вчера, 18:04',
    detail: 'Сумма 148 000 ₽, онлайн-оплата'
  },
  {
    id: '3',
    event: 'Изменён статус заказа #538',
    actor: 'Антон Еремеев',
    target: 'Заказ #538',
    timestamp: 'Вчера, 11:22',
    detail: 'Автоматически переведён в «К выдаче» после готовности'
  }
];

interface OrderCard {
  id: string;
  company: string;
  amount: string;
  manager: string;
  due: string;
  status: string;
  tone: StatusTone;
}

interface OrderStage {
  id: string;
  title: string;
  badge: string;
  orders: OrderCard[];
}

const ORDER_STAGES: OrderStage[] = [
  {
    id: 'new',
    title: 'Новые заявки',
    badge: 'ожидают реакции',
    orders: [
      {
        id: '#551',
        company: 'Альянс',
        amount: '86 000 ₽',
        manager: 'Анна Крылова',
        due: 'Сегодня',
        status: 'Назначен менеджер',
        tone: 'neutral'
      },
      {
        id: '#552',
        company: 'Заря',
        amount: '64 300 ₽',
        manager: '—',
        due: 'Завтра',
        status: 'Ожидает назначения',
        tone: 'warning'
      }
    ]
  },
  {
    id: 'in_progress',
    title: 'В работе',
    badge: 'готовятся документы',
    orders: [
      {
        id: '#542',
        company: 'ЛайтМедиа',
        amount: '148 000 ₽',
        manager: 'Павел Щукин',
        due: 'Через 2 дня',
        status: 'Ожидание оплаты',
        tone: 'warning'
      },
      {
        id: '#538',
        company: 'ПромТех',
        amount: '212 400 ₽',
        manager: 'Антон Еремеев',
        due: 'К выдаче',
        status: 'Готов к отгрузке',
        tone: 'success'
      }
    ]
  },
  {
    id: 'completed',
    title: 'Завершено',
    badge: 'закрытые сделки',
    orders: [
      {
        id: '#533',
        company: 'Интегро',
        amount: '98 600 ₽',
        manager: 'Мария Румянцева',
        due: 'Вчера',
        status: 'Оплачено и доставлено',
        tone: 'success'
      }
    ]
  }
];

interface PaymentRecord {
  id: string;
  customer: string;
  amount: string;
  method: string;
  status: string;
  tone: StatusTone;
  hint: string;
}

const PAYMENTS: PaymentRecord[] = [
  {
    id: 'INV-542',
    customer: 'ЛайтМедиа',
    amount: '148 000 ₽',
    method: 'Онлайн, карта',
    status: 'Ожидает подтверждения банка',
    tone: 'warning',
    hint: '3-D Secure завершён, проверяем банк'
  },
  {
    id: 'INV-533',
    customer: 'Интегро',
    amount: '98 600 ₽',
    method: 'Онлайн, ЮKassa',
    status: 'Оплачено',
    tone: 'success',
    hint: 'Квитанция отправлена клиенту'
  },
  {
    id: 'INV-527',
    customer: 'Север',
    amount: '54 200 ₽',
    method: 'Безналичный счёт',
    status: 'Ожидание оплаты',
    tone: 'warning',
    hint: 'Напоминание у клиента на завтра'
  }
];

interface InsightCard {
  id: string;
  title: string;
  value: string;
  trend: string;
  detail: string;
}

const ANALYTICS: InsightCard[] = [
  {
    id: 'conversion',
    title: 'Конверсия воронки',
    value: '34%',
    trend: '+6 п.п.',
    detail: 'Лучше прошлой недели — благодаря коротким срокам ответа'
  },
  {
    id: 'avg_check',
    title: 'Средний чек',
    value: '68 400 ₽',
    trend: '+4%',
    detail: 'Чаще выбирают расширенный пакет поддержки'
  },
  {
    id: 'debts',
    title: 'Задолженность',
    value: '214 000 ₽',
    trend: '−28%',
    detail: 'Большинство счетов закрываются в течение 5 дней'
  }
];

const CHECKLIST_STEPS = [
  'Проверить новые заявки и назначить менеджера',
  'Просмотреть заказы с ожиданием оплаты',
  'Убедиться в отправке счётов и актов',
  'Посмотреть аудит изменений перед еженедельным отчётом'
];

const SUPPORT_TAGS = [
  'Обучение сотрудников',
  'Настройка тарифов',
  'Загрузка прайс-листов',
  'Готовые шаблоны отчётов'
];

const SUPPORT_CONTACTS = [
  {
    label: 'Чат с командой SimplyCRM',
    description: 'Ответ в течение 10 минут'
  },
  {
    label: 'Видеозвонок по внедрению',
    description: 'Доступен в рабочие дни 10:00–18:00'
  }
];

const toneClass = (tone: StatusTone) => {
  if (tone === 'success') return styles.statusSuccess;
  if (tone === 'warning') return styles.statusWarning;
  return styles.statusNeutral;
};

export const DashboardPage = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  const summary = useMemo(
    () => ({
      overdueOrders: ORDER_STAGES.flatMap((stage) => stage.orders).filter((order) => order.tone === 'warning').length,
      completedOrders: ORDER_STAGES.flatMap((stage) => stage.orders).filter((order) => order.tone === 'success').length,
      pendingPayments: PAYMENTS.filter((payment) => payment.tone !== 'success').length
    }),
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id));
    if (!('IntersectionObserver' in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          const sectionId = visible[0].target.id as SectionKey;
          setActiveSection(sectionId);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.1, 0.25, 0.6] }
    );

    sections.forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      sections.forEach((section) => {
        if (section) {
          observer.unobserve(section);
        }
      });
      observer.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleNavigate = (sectionId: SectionKey) => {
    setActiveSection(sectionId);
    if (typeof window !== 'undefined') {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>SimplyCRM — рабочая область</title>
      </Helmet>
      <div className={clsx(styles.page, theme === 'dark' ? styles.dark : styles.light)}>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarBadge}>CRM Simply</span>
              <h1>Рабочая область</h1>
              <p>Все ключевые процессы — от ролей и аудита до оплаты и аналитики — собраны в одном понятном интерфейсе.</p>
            </div>
            <div className={styles.themeToggle}>
              <div>
                <span className={styles.themeToggleLabel}>{theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}</span>
                <span className={styles.themeToggleHint}>
                  {theme === 'light' ? 'Комфортно днём и при презентациях' : 'Экран не слепит в тёмной комнате'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={clsx(styles.themeSwitch, theme === 'dark' && styles.themeSwitchActive)}
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
                  onClick={() => handleNavigate(item.id)}
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
                <span>Заказы к вниманию</span>
                <strong>{summary.overdueOrders}</strong>
              </div>
              <div className={styles.sidebarStat}>
                <span>Оплачено за неделю</span>
                <strong>{summary.completedOrders}</strong>
              </div>
              <div className={styles.sidebarStat}>
                <span>Ожидают оплаты</span>
                <strong>{summary.pendingPayments}</strong>
              </div>
            </div>
          </aside>

        <main className={styles.main}>
          <section id="overview" className={styles.hero}>
            <div className={styles.heroContent}>
              <h2>
                Ваш SimplyCRM
                <span>Простая воронка, понятные оплаты и прозрачный аудит без лишней автоматизации.</span>
              </h2>
              <p>Управляйте ролями, отслеживайте шаги заказов и контролируйте онлайн-оплаты через единое окно. Всё стилизовано в духе современной SimplyCRM — ничего лишнего, только нужные блоки.</p>
              <div className={styles.heroActions}>
                <Button>Добавить заказ</Button>
                <Button variant="secondary">Настроить роли</Button>
              </div>
            </div>
            <div className={styles.heroHighlights}>
              {HIGHLIGHT_METRICS.map((metric) => (
                <div key={metric.id} className={styles.highlightCard}>
                  <div className={styles.highlightTitle}>
                    <span>{metric.label}</span>
                  </div>
                  <div className={styles.highlightValue}>{metric.value}</div>
                  <p className={styles.highlightHint}>{metric.hint}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="roles" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h3>Роли и уровни доступа</h3>
                <span>Расширенные права без сложных правил — всё понятно и наглядно.</span>
              </div>
              <Button variant="secondary">Создать роль</Button>
            </div>
            <div className={styles.roleGrid}>
              {ROLE_MATRIX.map((role) => (
                <div key={role.role} className={styles.roleCard}>
                  <div className={styles.roleHeader}>
                    <strong>{role.role}</strong>
                    <span className={styles.roleBadge}>{role.level}</span>
                  </div>
                  <p>{role.purpose}</p>
                  <div className={styles.rolePermissions}>
                    {role.permissions.map((permission) => (
                      <span key={permission}>{permission}</span>
                    ))}
                  </div>
                  <div className={styles.tagList}>
                    {role.featureFlags.map((flag) => (
                      <span key={flag} className={styles.permissionFlag}>
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="audit" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h3>Аудит действий</h3>
                <span>Контроль изменений по заказам, оплатам и ролям в едином журнале.</span>
              </div>
              <Button variant="secondary">Экспорт журнала</Button>
            </div>
            <div className={styles.timeline}>
              {AUDIT_LOG.map((record) => (
                <div key={record.id} className={styles.timelineItem}>
                  <strong>{record.event}</strong>
                  <div className={styles.timelineMeta}>
                    <span>{record.actor}</span>
                    <span>{record.target}</span>
                    <span>{record.timestamp}</span>
                  </div>
                  <span>{record.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="orders" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h3>Воронка заказов</h3>
                <span>Автоматические переходы статусов и напоминания без вебхуков.</span>
              </div>
              <Button variant="secondary">Шаблоны статусов</Button>
            </div>
            <div className={styles.ordersBoard}>
              {ORDER_STAGES.map((stage) => (
                <div key={stage.id} className={styles.orderColumn}>
                  <header>
                    <h4>{stage.title}</h4>
                    <span className={styles.orderBadge}>{stage.badge}</span>
                  </header>
                  {stage.orders.map((order) => (
                    <div key={order.id} className={styles.orderCard}>
                      <div className={styles.orderMeta}>
                        <strong>{order.id}</strong>
                        <span className={`${styles.statusBadge} ${toneClass(order.tone)}`}>{order.status}</span>
                      </div>
                      <div className={styles.orderMeta}>
                        <span>{order.company}</span>
                        <span>{order.amount}</span>
                      </div>
                      <div className={styles.orderMeta}>
                        <span>{order.manager}</span>
                        <span>{order.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section id="payments" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h3>Онлайн-оплаты</h3>
                <span>Безопасный приём платежей и понятные статусы по каждому счёту.</span>
              </div>
              <Button variant="secondary">Добавить провайдера</Button>
            </div>
            <div className={styles.paymentsList}>
              {PAYMENTS.map((payment) => (
                <div key={payment.id} className={styles.paymentRow}>
                  <div className={styles.paymentMeta}>
                    <strong>{payment.id}</strong>
                    <span>{payment.customer}</span>
                  </div>
                  <div className={styles.paymentMeta}>
                    <strong>{payment.amount}</strong>
                    <span>{payment.method}</span>
                  </div>
                  <div className={styles.paymentMeta}>
                    <span className={`${styles.statusBadge} ${toneClass(payment.tone)}`}>{payment.status}</span>
                    <span>{payment.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="analytics" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h3>Статистика и аналитика</h3>
                <span>Простые показатели для ежедневной оценки.</span>
              </div>
              <Button variant="secondary">Экспортировать отчёт</Button>
            </div>
            <div className={styles.analyticsGrid}>
              {ANALYTICS.map((insight) => (
                <div key={insight.id} className={styles.analyticsCard}>
                  <span>{insight.title}</span>
                  <strong>{insight.value}</strong>
                  <span>{insight.trend}</span>
                  <span>{insight.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.secondary}>
          <div id="support" className={styles.secondaryCard}>
            <header>
              <h4>Чек-лист дня</h4>
              <span>Сосредоточьтесь на понятных шагах</span>
            </header>
            <div className={styles.checklist}>
              {CHECKLIST_STEPS.map((step) => (
                <label key={step} className={styles.checklistItem}>
                  <input type="checkbox" />
                  <span>{step}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.secondaryCard}>
            <header>
              <h4>Помощь и внедрение</h4>
              <span>Поддержка без сложных интеграций</span>
            </header>
            <div className={styles.supportBlock}>
              <strong>Готовые материалы</strong>
              <div className={styles.tagList}>
                {SUPPORT_TAGS.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.secondaryActions}>
              <Button>Написать в поддержку</Button>
              <Button variant="secondary">Запланировать звонок</Button>
            </div>
            <div className={styles.timeline}>
              {SUPPORT_CONTACTS.map((contact) => (
                <div key={contact.label} className={styles.timelineItem}>
                  <strong>{contact.label}</strong>
                  <span>{contact.description}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      </div>
    </>
  );
};
