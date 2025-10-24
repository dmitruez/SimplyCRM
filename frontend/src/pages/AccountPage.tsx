import {Helmet} from 'react-helmet-async';

import styles from './AccountPage.module.css';
import {useAuthContext} from '../providers/AuthProvider';
import {Button} from '../components/ui/Button';

export const AccountPage = () => {
    const {profile, status, refreshProfile} = useAuthContext();
    const isAuthenticated = status === 'authenticated' && profile;

    if (!isAuthenticated || !profile) {
        return <p>Для просмотра профиля необходимо войти.</p>;
    }

    return (
        <div className={styles.wrapper}>
            <Helmet>
                <title>Аккаунт — SimplyCRM</title>
            </Helmet>
            <header className={styles.header}>
                <div>
                    <h1>Профиль пользователя</h1>
                    <p>Управляйте личными данными, организацией и доступными фичами.</p>
                </div>
                <Button onClick={() => refreshProfile()}>Обновить профиль</Button>
            </header>
            <div className={styles.grid}>
                <section className={styles.card}>
                    <h2>Личные данные</h2>
                    <p>
                        <strong>Имя:</strong> {profile.firstName ?? '—'} {profile.lastName ?? ''}
                    </p>
                    <p>
                        <strong>Имя пользователя:</strong> {profile.username}
                    </p>
                    <p>
                        <strong>Email:</strong> {profile.email}
                    </p>
                </section>
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
            </div>
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
