import {ReactNode, useEffect, useState} from 'react';

import {notificationBus, NotificationMessage} from './notificationBus';
import styles from './NotificationProvider.module.css';

const AUTO_DISMISS_MS = 5000;

interface Props {
    children: ReactNode;
}

export const NotificationProvider = ({children}: Props) => {
    const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

    useEffect(() => {
        return notificationBus.subscribe((notification) => {
            setNotifications((prev) => [...prev, notification]);
            window.setTimeout(() => {
                setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
            }, AUTO_DISMISS_MS);
        });
    }, []);

    return (
        <>
            {children}
            <div className={styles.container} role="status" aria-live="polite">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`${styles.notification} ${styles[notification.type]}`}
                    >
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                    </div>
                ))}
            </div>
        </>
    );
};
