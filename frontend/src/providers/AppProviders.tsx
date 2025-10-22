import { ReactNode, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager
} from '@tanstack/react-query';

import { AuthProvider } from './AuthProvider';
import { NotificationProvider } from '../components/notifications/NotificationProvider';

if (typeof window !== 'undefined') {
  focusManager.setEventListener((handleFocus) => {
    window.addEventListener('visibilitychange', handleFocus, false);
    window.addEventListener('focus', handleFocus, false);
    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
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

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AuthProvider>{children}</AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};
