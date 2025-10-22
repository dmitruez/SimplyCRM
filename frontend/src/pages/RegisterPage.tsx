import { Helmet } from 'react-helmet-async';

import { Card } from '../components/ui/Card';
import styles from './AuthPage.module.css';

export const RegisterPage = () => (
  <div className={styles.wrapper}>
    <Helmet>
      <title>Регистрация SimplyCRM</title>
    </Helmet>
    <Card className={styles.card}>
      <h1>Регистрация</h1>
      <p>
        Регистрация через сайт появится после включения соответствующих эндпоинтов на бэкенде. Пока
        что создайте аккаунт через администратора или свяжитесь с нами.
      </p>
      <p className={styles.helpText}>
        После включения social login добавим кнопку Google и защиту CSRF согласно плану.
      </p>
    </Card>
  </div>
);
