import {Helmet} from 'react-helmet-async';
import {useNavigate} from 'react-router-dom';

import {Button} from '../components/ui/Button';
import {Card} from '../components/ui/Card';
import {FeatureList} from '../components/ui/FeatureList';
import {MetricTile} from '../components/ui/MetricTile';
import {IdeaCard} from '../components/ui/IdeaCard';
import styles from './HomePage.module.css';

const featureHighlights = [
    'Мультиарендная архитектура с гибкими фичами',
    'Каталог товаров и поставщиков с управлением запасами',
    'Продажи и биллинг с поддержкой полного цикла сделок',
    'Глубокая аналитика: RFM, прогноз спроса, рекомендации цен',
    'AI-ассистент с доступом к вашим CRM данным'
];

const apiFeatureCards = [
    {
        title: 'Catalog API',
        description: 'Товары, варианты, поставщики и цены. Базис для e-commerce интеграций.'
    },
    {
        title: 'Sales API',
        description: 'Лиды, сделки, счета, отгрузки и канбан пайплайн.'
    },
    {
        title: 'Analytics API',
        description: 'RFM сегменты, прогнозы спроса, price recommendations и anomaly detection.'
    },
    {
        title: 'Automation API',
        description: 'Сценарии, правила, уведомления и webhooks.'
    },
    {
        title: 'AI Assistant',
        description: 'GPT-ответы с доступом к метрикам CRM. Консультации за секунды.'
    },
    {
        title: 'Integrations API',
        description: 'API-ключи, коннекторы, источники данных и управление событиями.'
    }
];

const ideaFeed = [
    {
        title: 'Персональные бандлы на основе RFM-аналитики',
        author: 'Алина, маркетинг',
        summary:
            'Создаем бандлы товаров с автоподбором, используя прогноз спроса и рекомендации цен.'
    },
    {
        title: 'AI-ассистент для поддержки',
        author: 'Максим, customer success',
        summary:
            'Используем GPT-подсказки для ответов клиентам, подключая CRM инсайты и историю сделок.'
    },
    {
        title: 'Автопилот по повторным продажам',
        author: 'Екатерина, продажи',
        summary:
            'Строим next-best-actions из модуля аналитики и запускаем кампании через Automation.'
    }
];

const metrics = [
    {
        title: 'Conversion Uplift',
        value: '+18% MoM',
        delta: 'Благодаря next-best-actions'
    },
    {title: 'Новые сделки', value: '1 245', delta: 'AI приоритизация'},
    {title: 'Снижение оттока', value: '−12%', delta: 'Повторные касания'}
];

export const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div>
            <Helmet>
                <title>SimplyCRM — CRM с AI и аналитикой</title>
            </Helmet>
            <section className={styles.hero}>
                <div className={styles.heroText}>
                    <h1>CRM нового поколения: данные + AI для роста продаж</h1>
                    <p>
                        SimplyCRM объединяет управление каталогом, продажи, аналитику и AI-ассистента. Вся
                        мощь Django + DRF под React-интерфейсом.
                    </p>
                    <div className={styles.heroActions}>
                        <Button onClick={() => navigate('/pricing')}>Посмотреть тарифы</Button>
                        <Button variant="secondary" onClick={() => navigate('/crm')}>
                            Демонстрация Dashboard
                        </Button>
                    </div>
                    <FeatureList items={featureHighlights}/>
                </div>
                <div className={styles.heroVisual}>
                    <Card variant="subdued">
                        <h3>AI-ассистент</h3>
                        <p>Ответы GPT с доступом к продажам, остаткам и прогнозам.</p>
                    </Card>
                    <div className={styles.metricsGrid}>
                        {metrics.map((metric) => (
                            <MetricTile
                                key={metric.title}
                                title={metric.title}
                                value={metric.value}
                                deltaLabel={metric.delta}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <header>
                    <h2>Возможности API</h2>
                    <p>
                        Стартуйте с REST-эндпоинтов или генерируйте клиента из схемы{' '}
                        <a href="/api/schema/">/api/schema/</a>.
                    </p>
                </header>
                <div className={styles.cardsGrid}>
                    {apiFeatureCards.map((card) => (
                        <Card key={card.title}>
                            <h3>{card.title}</h3>
                            <p>{card.description}</p>
                        </Card>
                    ))}
                </div>
                <p>
                    Документация доступна в <a href="/api/docs/">Swagger UI</a> и{' '}
                    <a href="/api/redoc/">Redoc</a>.
                </p>
            </section>

            <section className={styles.section}>
                <header>
                    <h2>Статистика продаж и прогнозы</h2>
                    <p>Виджеты подгружают данные из sales-metrics, anomalies, demand-forecast и др.</p>
                </header>
                <div className={styles.cardsGrid}>
                    <Card>
                        <h3>Продажи</h3>
                        <p>Графики по выручке, конверсии, LTV и повторным покупкам.</p>
                    </Card>
                    <Card>
                        <h3>Аномалии</h3>
                        <p>Автоматически подсвечиваем отклонения и узкие места.</p>
                    </Card>
                    <Card>
                        <h3>Рекомендации цен</h3>
                        <p>AI рекомендует цены с учетом спроса и конкурентов.</p>
                    </Card>
                    <Card>
                        <h3>Next best actions</h3>
                        <p>Приоритетные действия по сделкам и клиентам.</p>
                    </Card>
                </div>
            </section>

            <section className={styles.section}>
                <header>
                    <h2>Идеи для бизнеса</h2>
                    <p>Сообщество делится кейсами, предложения проходят модерацию и антиспам-фильтры.</p>
                </header>
                <div className={styles.ideasGrid}>
                    {ideaFeed.map((idea) => (
                        <IdeaCard
                            key={idea.title}
                            title={idea.title}
                            author={idea.author}
                            summary={idea.summary}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
