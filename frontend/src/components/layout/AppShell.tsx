import clsx from 'clsx';
import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { Button } from '../ui/Button';
import styles from './AppShell.module.css';
import { useAuthContext } from '../../providers/AuthProvider';

interface AppShellProps {
  children: ReactNode;
}

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? clsx(styles.navLink, styles.active) : styles.navLink;

export const AppShell = ({ children }: AppShellProps) => {
  const { status, logout } = useAuthContext();
  const isAuthenticated = status === 'authenticated';

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span role="img" aria-label="SimplyCRM logo">
            💠
          </span>
          SimplyCRM
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/" className={navLinkClassName}>
            Главная
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/products" className={navLinkClassName}>
              Каталог
            </NavLink>
          ) : null}
          <NavLink to="/pricing" className={navLinkClassName}>
            Тарифы
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/crm" className={navLinkClassName}>
              CRM
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <NavLink to="/account" className={navLinkClassName}>
              Аккаунт
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <Button variant="secondary" onClick={() => logout()}>
              Выйти
            </Button>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClassName}>
                Войти
              </NavLink>
              <NavLink to="/register" className={clsx(styles.navLink, styles.signup)}>
                Регистрация
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SimplyCRM</span>
        <span>Работает поверх Django + DRF</span>
      </footer>
    </div>
  );
};
