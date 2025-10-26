import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import styles from './AccountPage.module.css';
import { useAuthContext } from '../providers/AuthProvider';
import { Button } from '../components/ui/Button';
import { billingApi } from '../api/billing';
import { notificationBus } from '../components/notifications/notificationBus';

export const AccountPage = () => {
  const { profile, status, refreshProfile, updateProfile } = useAuthContext();
  const isAuthenticated = status === 'authenticated' && Boolean(profile);
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    title: profile?.title ?? '',
    timezone: profile?.timezone ?? 'UTC',
    locale: profile?.locale ?? 'ru-RU'
  });

  useEffect(() => {
    if (profile) {
      setFormState({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email,
        title: profile.title ?? '',
        timezone: profile.timezone ?? 'UTC',
        locale: profile.locale ?? 'ru-RU'
      });
    }
  }, [profile]);

  const { data: billing, isLoading: isBillingLoading } = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: billingApi.getOverview,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000
  });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось сохранить профиль',
        message: 'Проверьте введённые данные и попробуйте снова.'
      });
    }
  });

  const planMutation = useMutation({
    mutationFn: (planKey: string) => billingApi.changePlan({ planKey }),
    onSuccess: async () => {
      notificationBus.publish({
        type: 'success',
        title: 'Тариф обновлён',
        message: 'Новый план активирован для вашей организации.'
      });
      await queryClient.invalidateQueries({ queryKey: ['billing', 'overview'] });
      await queryClient.invalidateQueries({ queryKey: ['billing', 'overview', 'api-access'] });
      await refreshProfile();
    },
    onError: () => {
      notificationBus.publish({
        type: 'error',
        title: 'Не удалось изменить тариф',
        message: 'Попробуйте выбрать другой план или повторите попытку позже.'
      });
    }
  });

    if (!isAuthenticated || !profile) {
        return <p>Для просмотра профиля необходимо войти.</p>;
    }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    profileMutation.mutate({ ...formState });
  };

  const currentPlanKey = billing?.currentSubscription?.plan.key;

  const sortedPlans = useMemo(() => {
    if (!billing) {
      return [];
    }
    return [...billing.availablePlans].sort((a, b) => a.pricePerMonth - b.pricePerMonth);
  }, [billing]);

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Аккаунт — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>Профиль пользователя</h1>
          <p>Обновляйте личные данные, управляйте подпиской и доступом к API.</p>
        </div>
        <Button onClick={() => refreshProfile()} disabled={profileMutation.isPending || planMutation.isPending}>
          Обновить профиль
        </Button>
      </header>

      <section className={styles.card}>
        <h2>Личные данные</h2>
        <form className={styles.profileForm} onSubmit={handleSubmit}>
          <label>
            Имя
            <input
              value={formState.firstName}
              onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
              placeholder="Имя"
            />
          </label>
          <label>
            Фамилия
            <input
              value={formState.lastName}
              onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
              placeholder="Фамилия"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Должность
            <input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Например, Руководитель отдела продаж"
            />
          </label>
          <label>
            Часовой пояс
            <input
              value={formState.timezone}
              onChange={(event) => setFormState((prev) => ({ ...prev, timezone: event.target.value }))}
            />
          </label>
          <label>
            Локаль
            <input
              value={formState.locale}
              onChange={(event) => setFormState((prev) => ({ ...prev, locale: event.target.value }))}
            />
          </label>
          <div className={styles.formActions}>
            <Button type="submit" disabled={profileMutation.isPending}>
              Сохранить изменения
            </Button>
          </div>
        </form>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Организация</h2>
          {profile.organization ? (
            <>
              <p>
                <strong>Название:</strong> {profile.organization.name}
              </p>
              <p>
                <strong>Slug:</strong> {profile.organization.slug}
              </p>
            </>
          ) : (
            <p>Организация не назначена.</p>
          )}
        </section>

        <section className={styles.card}>
          <h2>Тарифный план</h2>
          {isBillingLoading ? (
            <p>Загружаем информацию о подписке…</p>
          ) : billing ? (
            <div className={styles.planList}>
              {sortedPlans.map((plan) => {
                const isActive = plan.key === currentPlanKey;
                return (
                  <div key={plan.id} className={styles.planItem} data-active={isActive}>
                    <div>
                      <strong>{plan.name}</strong>
                      <span className={styles.planPrice}>{plan.pricePerMonth === 0 ? 'Бесплатно' : `${plan.pricePerMonth.toLocaleString('ru-RU')} ₽/мес`}</span>
                      <small>{plan.description}</small>
                    </div>
                    <Button
                      variant={isActive ? 'secondary' : 'primary'}
                      disabled={isActive || planMutation.isPending}
                      onClick={() => planMutation.mutate(plan.key)}
                    >
                      {isActive ? 'Активный план' : 'Перейти на план'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>Не удалось загрузить тарифы. Попробуйте позже.</p>
          )}
        </section>
      </div>

      <section className={styles.card}>
        <h2>API и интеграции</h2>
        {billing ? (
          <div className={styles.apiSection}>
            <div className={styles.apiKeyBox}>
              <span>API ключ:</span>
              <code>{billing.apiToken}</code>
              <Button
                variant="secondary"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(billing.apiToken);
                    notificationBus.publish({
                      type: 'info',
                      title: 'Скопировано',
                      message: 'API ключ скопирован в буфер обмена.'
                    });
                  }
                }}
              >
                Скопировать
              </Button>
            </div>
            <p>
              Доступные методы API зависят от выбранного тарифа. Просмотрите подробную документацию и готовые примеры
              использования на странице доступа к API.
            </p>
            <Link to="/account/api-access" className={styles.apiLink}>
              Открыть документацию API →
            </Link>
          </div>
        ) : (
          <p>Загрузка данных об API…</p>
        )}
      </section>

      <section className={styles.card}>
        <h2>Активные возможности</h2>
        {profile.featureFlags.length === 0 ? (
          <p>Feature-флаги пока не активированы.</p>
        ) : (
          <div className={styles.flagList}>
            {profile.featureFlags.map((flag) => (
              <div key={flag.code} className={styles.flagItem}>
                <strong>{flag.name || flag.code}</strong>
                <span>{flag.enabled ? 'Активно' : 'Отключено'}</span>
                {flag.description ? <small>{flag.description}</small> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
