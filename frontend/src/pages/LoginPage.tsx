import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthContext } from '../providers/AuthProvider';
import { notificationBus } from '../components/notifications/notificationBus';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import styles from './AuthPage.module.css';

interface LoginFormValues {
  username: string;
  password: string;
}

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: { username: '', password: '' }
  });
  const { login, loginWithGoogle, status } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === 'authenticated') {
      const redirect = (location.state as any)?.from?.pathname ?? '/crm';
      navigate(redirect, { replace: true });
    }
  }, [location.state, navigate, status]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      notificationBus.publish({
        type: 'success',
        title: 'Вход выполнен',
        message: 'Добро пожаловать в SimplyCRM!'
      });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      notificationBus.publish({
        type: 'error',
        title: 'Ошибка авторизации',
        message: detail ?? 'Проверьте логин и пароль или дождитесь разблокировки.'
      });
    }
  });

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>Войти в SimplyCRM</title>
      </Helmet>
      <Card className={styles.card}>
        <h1>Вход</h1>
        <form className={styles.form} onSubmit={onSubmit} autoComplete="off">
          <div className={styles.inputGroup}>
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              className={styles.input}
              {...register('username', { required: 'Введите имя пользователя' })}
            />
            {errors.username ? (
              <span className={styles.helpText}>{errors.username.message}</span>
            ) : null}
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              autoComplete="new-password"
              {...register('password', { required: 'Введите пароль' })}
            />
            {errors.password ? (
              <span className={styles.helpText}>{errors.password.message}</span>
            ) : null}
          </div>
          <div className={styles.helpText}>
            reCAPTCHA / Turnstile появится здесь при подключении ключей на бэкенде.
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Войти
          </Button>
        </form>
        <div className={styles.divider}>
          <span>или</span>
        </div>
        <GoogleLoginButton
          onCredential={async (credential) => {
            await loginWithGoogle({ credential });
            notificationBus.publish({
              type: 'success',
              title: 'Добро пожаловать',
              message: 'Вход через Google выполнен.'
            });
          }}
        />
        <p className={styles.helpText}>
          Слишком много попыток? Подождите, пока аккаунт разблокируется, и повторите вход.
        </p>
        <p className={styles.helpText}>
          Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link> за пару шагов или через Google.
        </p>
      </Card>
    </div>
  );
};
