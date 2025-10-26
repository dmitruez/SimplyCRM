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
import { getAccessToken, setAccessToken } from '../api/apiClient';
import {
  AuthContextValue,
  AuthState,
  FeatureFlag,
  RegistrationFormValues,
  UserProfile
} from '../types/auth';
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
  const [state, setState] = useState<AuthState>(() => {
    const token = getAccessToken();
    if (token) {
      return { status: 'loading', profile: null, accessToken: token };
    }
    return initialState;
  });
  const isMounted = useRef(true);

  type AuthStateUpdate = Partial<AuthState> | ((prev: AuthState) => AuthState);

  const setAuthState = useCallback((update: AuthStateUpdate) => {
    setState((prev) => {
      if (typeof update === 'function') {
        return (update as (snapshot: AuthState) => AuthState)(prev);
      }
      return { ...prev, ...update };
    });
  }, []);

  const applyAuthResult = useCallback(
    (payload: { access: string; profile: UserProfile }) => {
      setAuthState({
        status: 'authenticated',
        accessToken: payload.access,
        profile: payload.profile
      });
      queryClient.setQueryData(FEATURE_FLAG_CACHE_KEY, payload.profile.featureFlags);
    },
    [queryClient]
  );

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setAuthState({ status: 'unauthenticated', profile: null, accessToken: null });
      return;
    }
    setAuthState((prev) => ({ ...prev, status: 'loading', accessToken: token }));
    try {
      const profile = await authApi.getProfile();
      if (!isMounted.current) return;

      setAuthState((prev) => ({
        ...prev,
        profile,
        status: 'authenticated',
        accessToken: token
      }));
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
        setAuthState({ status: 'unauthenticated', profile: null, accessToken: null });
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
      setAuthState((prev) => ({ ...prev, status: 'loading' }));
      const result = await authApi.login(payload);
      applyAuthResult({ access: result.access, profile: result.profile });
    },
    [applyAuthResult]
  );

  const loginWithGoogle = useCallback<AuthContextValue['loginWithGoogle']>(
    async (payload) => {
      setAuthState((prev) => ({ ...prev, status: 'loading' }));
      const result = await authApi.loginWithGoogle(payload);
      applyAuthResult({ access: result.access, profile: result.profile });
    },
    [applyAuthResult]
  );

  const register = useCallback(
    async (payload: RegistrationFormValues) => {
      setAuthState((prev) => ({ ...prev, status: 'loading' }));
      const result = await authApi.register(payload);
      applyAuthResult({ access: result.access, profile: result.profile });
    },
    [applyAuthResult]
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await authApi.logout();
    setAuthState({ status: 'unauthenticated', profile: null, accessToken: null });
    queryClient.removeQueries();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (payload) => {
      const profile = await authApi.updateProfile({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        title: payload.title,
        timezone: payload.timezone,
        locale: payload.locale
      });
      setAuthState((prev) => ({
        ...prev,
        status: 'authenticated',
        profile
      }));
      queryClient.setQueryData(FEATURE_FLAG_CACHE_KEY, profile.featureFlags);
      notificationBus.publish({
        type: 'success',
        title: 'Профиль обновлён',
        message: 'Изменения успешно сохранены.'
      });
      return profile;
    },
    [queryClient]
  );

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
      loginWithGoogle,
      register,
      logout,
      refreshProfile,
      isFeatureEnabled,
      updateProfile
    }),
    [isFeatureEnabled, login, loginWithGoogle, logout, refreshProfile, register, state, updateProfile]
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
