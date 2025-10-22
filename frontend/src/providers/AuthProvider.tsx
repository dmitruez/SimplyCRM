import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authApi } from '../api/auth';
import { setAccessToken } from '../api/apiClient';
import { AuthContextValue, AuthState, FeatureFlag } from '../types/auth';
import { notificationBus } from '../components/notifications/notificationBus';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  status: 'idle',
  profile: null,
  accessToken: null
};

const FEATURE_FLAG_CACHE_KEY = ['auth', 'featureFlags'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(initialState);
  const isMounted = useRef(true);

  const setAuthState = useCallback((partial: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchProfile = useCallback(async () => {
    setAuthState({ status: 'loading' });
    try {
      const profile = await authApi.getProfile();
      if (!isMounted.current) return;

      setAuthState({ profile, status: 'authenticated' });
      queryClient.setQueryData(FEATURE_FLAG_CACHE_KEY, profile.featureFlags);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setAccessToken(null);
        setAuthState({ status: 'unauthenticated', profile: null, accessToken: null });
      } else {
        notificationBus.publish({
          type: 'error',
          title: 'Не удалось загрузить профиль',
          message: 'Попробуйте обновить страницу или войдите снова.'
        });
        setAuthState({ status: 'unauthenticated', profile: null });
      }
    }
  }, [queryClient, setAuthState]);

  useEffect(() => {
    fetchProfile();
    return () => {
      isMounted.current = false;
    };
  }, [fetchProfile]);

  const login = useCallback<AuthContextValue['login']>(
    async (payload) => {
      setAuthState({ status: 'loading' });
      const token = await authApi.login(payload);
      setAuthState({ accessToken: token });
      await fetchProfile();
    },
    [fetchProfile, setAuthState]
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await authApi.logout();
    setAuthState({ status: 'unauthenticated', profile: null, accessToken: null });
    queryClient.removeQueries();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const isFeatureEnabled = useCallback(
    (code: string) => {
      const flags: FeatureFlag[] =
        queryClient.getQueryData(FEATURE_FLAG_CACHE_KEY) ??
        state.profile?.featureFlags ??
        [];

      return flags.some((flag) => flag.code === code && flag.enabled);
    },
    [queryClient, state.profile?.featureFlags]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshProfile,
      isFeatureEnabled
    }),
    [isFeatureEnabled, login, logout, refreshProfile, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
