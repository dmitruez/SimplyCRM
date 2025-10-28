import {useMemo} from 'react';
import {useForm} from 'react-hook-form';
import {useQuery} from '@tanstack/react-query';
import {Helmet} from 'react-helmet-async';
import {Link} from 'react-router-dom';

import {Card} from '../components/ui/Card';
import {Button} from '../components/ui/Button';
import {pricingApi} from '../api/pricing';
import {PricingPlan} from '../types/pricing';
import {useAuthContext} from '../providers/AuthProvider';
import {RegistrationFormValues} from '../types/auth';
import {notificationBus} from '../components/notifications/notificationBus';
import {GoogleLoginButton} from '../components/auth/GoogleLoginButton';
import styles from './AuthPage.module.css';

const formatPrice = (value: number, currency: string) =>
    new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
    }).format(value);

const registrationFallbackPlans: PricingPlan[] = [
    {
        id: 1,
        key: 'free',
        name: 'Starter',
        description: 'Бесплатный план для старта',
        pricePerMonth: 0,
        currency: 'RUB',
        trialDays: 30,
        featureFlags: [
            {code: 'catalog.read', label: 'Каталог: просмотр'},
            {code: 'sales.pipeline', label: 'Канбан сделок'},
            {code: 'assistant.chat', label: 'AI-ассистент (10 вопросов)'}
        ]
    },
    {
        id: 2,
        key: 'pro',
        name: 'Growth',
        description: 'Профессиональные инструменты для растущих команд',
        pricePerMonth: 5900,
        currency: 'RUB',
        trialDays: 14,
        featureFlags: [
            {code: 'catalog.manage', label: 'Каталог: полный CRUD'},
            {code: 'sales.order_management', label: 'Заказы и счета'},
            {code: 'analytics.forecasting', label: 'Прогноз спроса'}
        ]
    },
    {
        id: 3,
        key: 'enterprise',
        name: 'Scale',
        description: 'Максимальные возможности и интеграции',
        pricePerMonth: 12900,
        currency: 'RUB',
        trialDays: 30,
        featureFlags: [
            {code: 'automation.rules', label: 'Автоматизация процессов'},
            {code: 'integrations.api_keys', label: 'Интеграции и вебхуки'},
            {code: 'analytics.insights', label: 'Глубокие отчеты и рекомендации'}
        ]
    }
];

export const RegisterPage = () => {
    const {
        register: registerField,
        handleSubmit,
        watch,
        setError,
        formState: {errors, isSubmitting}
    } = useForm<RegistrationFormValues>({
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            organizationName: '',
            registerWithoutCompany: false,
            inviteToken: '',
            planKey: 'free'
        }
    });
    const {register: registerAccount, loginWithGoogle} = useAuthContext();
    const organizationName = watch('organizationName');
    const registerWithoutCompany = watch('registerWithoutCompany');
    const planKey = watch('planKey');

    const {data: plansData, isLoading: plansLoading} = useQuery({
        queryKey: ['pricing', 'plans'],
        queryFn: pricingApi.listPlans,
        staleTime: 5 * 60 * 1000
    });

    const plans = useMemo(() => plansData ?? registrationFallbackPlans, [plansData]);

    const onSubmit = handleSubmit(async (values) => {
        if (values.password !== values.confirmPassword) {
            setError('confirmPassword', {type: 'validate', message: 'Пароли должны совпадать'});
            return;
        }
        if (!values.registerWithoutCompany && !values.organizationName?.trim()) {
            setError('organizationName', {type: 'validate', message: 'Укажите название компании'});
            return;
        }

        try {
            await registerAccount({
                ...values,
                organizationName: values.registerWithoutCompany ? undefined : values.organizationName?.trim(),
                inviteToken: values.inviteToken?.trim() || undefined,
                planKey: values.planKey ?? undefined
            });
            notificationBus.publish({
                type: 'success',
                title: 'Аккаунт создан',
                message: 'Мы подготовили рабочее пространство и активировали пробный период.'
            });
        } catch (error: any) {
            const detail = error?.response?.data?.detail;
            notificationBus.publish({
                type: 'error',
                title: 'Не удалось зарегистрироваться',
                message: detail ?? 'Проверьте данные и попробуйте снова.'
            });
        }
    });

    return (
        <div className={styles.wrapper}>
            <Helmet>
                <title>Регистрация SimplyCRM</title>
            </Helmet>
            <Card className={styles.card}>
                <h1>Создать аккаунт SimplyCRM</h1>
                <form className={styles.form} onSubmit={onSubmit} autoComplete="off">
                    <div className={styles.twoColumns}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="firstName">Имя</label>
                            <input
                                id="firstName"
                                type="text"
                                className={styles.input}
                                {...registerField('firstName', {required: 'Введите имя'})}
                            />
                            {errors.firstName ? (
                                <span className={styles.helpText}>{errors.firstName.message}</span>
                            ) : null}
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="lastName">Фамилия</label>
                            <input
                                id="lastName"
                                type="text"
                                className={styles.input}
                                {...registerField('lastName', {required: 'Введите фамилию'})}
                            />
                            {errors.lastName ? (
                                <span className={styles.helpText}>{errors.lastName.message}</span>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className={styles.input}
                            {...registerField('email', {required: 'Укажите рабочий email'})}
                        />
                        {errors.email ? <span className={styles.helpText}>{errors.email.message}</span> : null}
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username">Имя пользователя</label>
                        <input
                            id="username"
                            type="text"
                            className={styles.input}
                            {...registerField('username', {required: 'Введите имя пользователя'})}
                        />
                        {errors.username ? (
                            <span className={styles.helpText}>{errors.username.message}</span>
                        ) : null}
                    </div>
                    <div className={styles.twoColumns}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Пароль</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                {...registerField('password', {
                                    required: 'Введите пароль',
                                    minLength: {value: 8, message: 'Минимум 8 символов'}
                                })}
                            />
                            {errors.password ? (
                                <span className={styles.helpText}>{errors.password.message}</span>
                            ) : (
                                <span className={styles.helpText}>Пароль должен быть сложным и уникальным.</span>
                            )}
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword">Повторите пароль</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className={styles.input}
                                {...registerField('confirmPassword', {required: 'Повторите пароль'})}
                            />
                            {errors.confirmPassword ? (
                                <span className={styles.helpText}>{errors.confirmPassword.message}</span>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel} htmlFor="registerWithoutCompany">
                            <input
                                id="registerWithoutCompany"
                                type="checkbox"
                                {...registerField('registerWithoutCompany')}
                            />
                            <span>Зарегистрироваться без компании</span>
                        </label>
                        <span className={styles.helpText}>
              Можно получить приглашение от администратора и присоединиться позже.
            </span>
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="organizationName">Компания / рабочее пространство</label>
                        <input
                            id="organizationName"
                            type="text"
                            className={styles.input}
                            disabled={registerWithoutCompany}
                            {...registerField('organizationName', {
                                validate: (value) => {
                                    if (registerWithoutCompany) {
                                        return true;
                                    }
                                    if (value?.trim()) {
                                        return true;
                                    }
                                    return 'Укажите название компании';
                                }
                            })}
                        />
                        <span className={styles.helpText}>
              На основе этого названия создадим отдельный тенант и подключим выбранный тариф.
            </span>
                        {errors.organizationName ? (
                            <span className={styles.helpText}>{errors.organizationName.message}</span>
                        ) : null}
                    </div>
                    {registerWithoutCompany ? (
                        <div className={styles.inputGroup}>
                            <label htmlFor="inviteToken">Код приглашения (необязательно)</label>
                            <input
                                id="inviteToken"
                                type="text"
                                className={styles.input}
                                placeholder="Вставьте код, если уже получили ссылку"
                                {...registerField('inviteToken')}
                            />
                            <span className={styles.helpText}>
                Если коллега отправил приглашение, вставьте код из ссылки, чтобы сразу подключиться.
              </span>
                        </div>
                    ) : null}
                    <div className={styles.inputGroup}>
                        <label htmlFor="planKey">Тарифный план</label>
                        <select
                            id="planKey"
                            className={styles.select}
                            {...registerField('planKey')}
                        >
                            {plans.map((plan) => (
                                <option key={plan.key} value={plan.key}>
                                    {plan.name} — {plan.pricePerMonth === 0 ? 'Бесплатно' : `${formatPrice(plan.pricePerMonth, plan.currency)} / мес`}
                                </option>
                            ))}
                        </select>
                        {plansLoading ? <span className={styles.helpText}>Загружаем планы из API...</span> : null}
                    </div>
                    <div className={styles.helpText}>
                        Отправляя форму, вы соглашаетесь с обработкой данных и политикой безопасности SimplyCRM.
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        Создать аккаунт
                    </Button>
                </form>
                <div className={styles.divider}>
                    <span>или</span>
                </div>
                <GoogleLoginButton
                    mode="signup"
                    onCredential={async (credential) => {
                        if (registerWithoutCompany) {
                            notificationBus.publish({
                                type: 'warning',
                                title: 'Google-регистрация с приглашением',
                                message: 'Укажите компанию или используйте форму выше, чтобы зарегистрироваться без компании.'
                            });
                            return;
                        }
                        if (!organizationName?.trim()) {
                            notificationBus.publish({
                                type: 'warning',
                                title: 'Укажите компанию',
                                message: 'Перед входом через Google заполните название компании и выберите тариф.'
                            });
                            return;
                        }
                        await loginWithGoogle({credential, organizationName: organizationName.trim(), planKey: planKey || undefined});
                        notificationBus.publish({
                            type: 'success',
                            title: 'Google аккаунт подключен',
                            message: 'Мы создали рабочее пространство и привязали аккаунт Google.'
                        });
                    }}
                />
                <p className={styles.helpText}>
                    У вас уже есть аккаунт? <Link to="/login">Войдите</Link> с логином и паролем либо через Google.
                </p>
            </Card>
        </div>
    );
};
