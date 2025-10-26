import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

import styles from './ApiAccessPage.module.css';
import { billingApi } from '../api/billing';
import { Button } from '../components/ui/Button';
import { notificationBus } from '../components/notifications/notificationBus';

export const ApiAccessPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'overview', 'api-access'],
    queryFn: billingApi.getOverview,
    staleTime: 5 * 60 * 1000
  });

  const methods = useMemo(() => data?.apiMethods ?? [], [data?.apiMethods]);

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>API доступ — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div>
          <h1>API SimplyCRM</h1>
          <p>Подробное описание доступных методов и рекомендации по использованию API ключа.</p>
        </div>
        <Button
          variant="secondary"
          disabled={!data}
          onClick={() => {
            if (data?.apiToken && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(data.apiToken);
              notificationBus.publish({
                type: 'info',
                title: 'Ключ скопирован',
                message: 'API ключ сохранён в буфер обмена.'
              });
            }
          }}
        >
          Скопировать API ключ
        </Button>
      </header>

      {isLoading && <p>Загружаем данные…</p>}
      {isError && <p>Не удалось получить информацию об API. Повторите попытку позже.</p>}

      {data ? (
        <>
          <section className={styles.tokenSection}>
            <h2>Ваш API ключ</h2>
            <p>
              Храните ключ в секрете и не публикуйте его в общедоступных репозиториях. Вы можете использовать его в HTTP
              заголовке <code>Authorization: Token &lt;ключ&gt;</code> для доступа к защищённым ресурсам.
            </p>
            <div className={styles.tokenBox}>
              <code>{data.apiToken}</code>
            </div>
          </section>

          <section className={styles.methodsSection}>
            <h2>Доступные методы</h2>
            {methods.length === 0 ? (
              <p>Для текущего тарифа API методы недоступны. Перейдите на более высокий план, чтобы получить расширенный доступ.</p>
            ) : (
              <ul className={styles.methodList}>
                {methods.map((method) => (
                  <li key={method.method}>
                    <strong>{method.method}</strong>
                    <span>{method.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.examplesSection}>
            <h2>Пример запроса</h2>
            <pre>
{`curl -X GET https://your-domain/api/catalog/products/ \
  -H "Authorization: Token ${data.apiToken}" \
  -H "Accept: application/json"`}
            </pre>
            <p>
              Для интеграции с серверными приложениями мы рекомендуем обновлять ключ каждые 90 дней и ограничивать его
              использование на стороне клиента.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
};
