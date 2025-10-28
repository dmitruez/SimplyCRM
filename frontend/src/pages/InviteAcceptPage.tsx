import {useEffect} from 'react';
import {Helmet} from 'react-helmet-async';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import styles from './AuthPage.module.css';
import {Card} from '../components/ui/Card';
import {Button} from '../components/ui/Button';
import {coreApi} from '../api/core';
import {useAuthContext} from '../providers/AuthProvider';
import {notificationBus} from '../components/notifications/notificationBus';

export const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status, refreshProfile } = useAuthContext();

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteToken: string) => coreApi.acceptInvite(inviteToken),
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['core', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['core', 'organization-invites'] });
      notificationBus.publish({
        type: 'success',
        title: 'Приглашение принято',
        message: 'Вы присоединились к рабочему пространству SimplyCRM.'
      });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail ?? 'Не удалось подтвердить приглашение.';
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка подтверждения',
        message: detail
      });
    }
  });

  useEffect(() => {
    if (status === 'authenticated' && token) {
      acceptInviteMutation.mutate(token);
    }
  }, [acceptInviteMutation, status, token]);

  const handleRetry = () => {
    if (token) {
      acceptInviteMutation.mutate(token);
    }
  };

  const renderContent = () => {
    if (!token) {
      return (
        <>
          <p>Код приглашения не найден. Проверьте ссылку или попросите отправить её снова.</p>
          <Button onClick={() => navigate('/crm')}>Вернуться на главную</Button>
        </>
      );
    }

    if (status !== 'authenticated') {
      return (
        <>
          <p>Чтобы принять приглашение, войдите в SimplyCRM под своей учётной записью.</p>
          <Link to="/login">Перейти к форме входа</Link>
        </>
      );
    }

    if (acceptInviteMutation.isPending) {
      return <p>Подтверждаем приглашение…</p>;
    }

    if (acceptInviteMutation.isSuccess) {
      return (
        <>
          <p>Приглашение принято! Теперь у вас есть доступ к рабочему пространству. Можно перейти в CRM или настроить профиль.</p>
          <div className={styles.twoColumns}>
            <Button onClick={() => navigate('/crm')}>Открыть CRM</Button>
            <Button variant="secondary" onClick={() => navigate('/account')}>Настройки профиля</Button>
          </div>
        </>
      );
    }

    if (acceptInviteMutation.isError) {
      return (
        <>
          <p>Не удалось принять приглашение. Попробуйте ещё раз или свяжитесь с администратором.</p>
          <Button onClick={handleRetry}>Повторить попытку</Button>
        </>
      );
    }

    return (
      <>
        <p>Нажмите кнопку ниже, чтобы подтвердить приглашение и получить доступ к рабочему пространству.</p>
        <Button onClick={handleRetry}>Принять приглашение</Button>
      </>
    );
  };

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Приглашение в SimplyCRM</title>
      </Helmet>
      <Card className={styles.card}>
        <h1>Приглашение в рабочее пространство</h1>
        {renderContent()}
      </Card>
    </div>
  );
};
