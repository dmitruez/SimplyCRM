import { ReactNode, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager
} from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { AuthProvider } from './AuthProvider';
import { NotificationProvider } from '../components/notifications/NotificationProvider';
import { env } from '../api/config/env';

if (typeof window !== 'undefined') {
  focusManager.setEventListener((handleFocus) => {
    const visibilityListener = () => handleFocus(!document.hidden);
    const focusListener = () => handleFocus(true);

    window.addEventListener('visibilitychange', visibilityListener, false);
    window.addEventListener('focus', focusListener, false);

    return () => {
      window.removeEventListener('visibilitychange', visibilityListener);
      window.removeEventListener('focus', focusListener);
    };
  });
}

interface Props {
  children: ReactNode;
}

export const AppProviders = ({ children }: Props) => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: (failureCount, error: unknown) => {
              if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                (error as any).response?.status === 429
              ) {
                return false;
              }
              return failureCount < 2;
            }
          }
        }
      }),
    []
  );

  const tree = (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AuthProvider>{children}</AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );

  if (!env.googleClientId) {
    return tree;
  }

  return <GoogleOAuthProvider clientId={env.googleClientId}>{tree}</GoogleOAuthProvider>;
};
