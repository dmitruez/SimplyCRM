import axios, {type AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import {env} from './config/env';
import {notificationBus} from '../components/notifications/notificationBus';

const TOKEN_STORAGE_KEY = 'simplycrm:accessToken';
const isBrowser = typeof window !== 'undefined';

let inMemoryToken: string | null = null;
let csrfToken: string | null = null;
let csrfRefreshPromise: Promise<string | null> | null = null;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

interface RequestMetadata {
    retryCount: number;
    signature?: string;
    csrfRetried?: boolean;
}

type RequestConfigWithMeta = InternalAxiosRequestConfig & {
    metadata?: RequestMetadata;
};

const ensureHeaders = (config: InternalAxiosRequestConfig): AxiosHeaders => {
    if (!config.headers) {
        const headers = new AxiosHeaders();
        config.headers = headers;
        return headers;
    }

    if (config.headers instanceof AxiosHeaders) {
        return config.headers;
    }

    const headers = AxiosHeaders.from(config.headers);
    config.headers = headers;
    return headers;
};

const createSignature = (config: InternalAxiosRequestConfig): string | null => {
    try {
        const method = (config.method ?? 'get').toUpperCase();
        const url = config.url ?? '';
        const params = config.params ? JSON.stringify(config.params) : '';
        let payload = '';
        if (config.data) {
            if (typeof config.data === 'string') {
                payload = config.data;
            } else {
                payload = JSON.stringify(config.data);
            }
        }
        const raw = `${method}|${url}|${params}|${payload}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i += 1) {
            hash = (hash << 5) - hash + raw.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    } catch (error) {
        console.warn('Failed to build request signature', error);
        return null;
    }
};

const readStoredToken = (): string | null => {
    if (!isBrowser) {
        return null;
    }
    try {
        return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
        console.warn('Не удалось прочитать сохраненный токен доступа', error);
        return null;
    }
};

inMemoryToken = readStoredToken();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setAccessToken = (token: string | null) => {
    inMemoryToken = token;
    if (!isBrowser) {
        return;
    }
    try {
        if (token) {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    } catch (error) {
        console.warn('Не удалось сохранить токен доступа', error);
    }
};

export const getAccessToken = () => inMemoryToken;

const extractTokenFromResponse = (response: AxiosResponse<{ csrfToken?: string }>): string | null => {
    const headerToken = response.headers?.['x-csrftoken'];
    if (typeof headerToken === 'string' && headerToken.trim().length > 0) {
        return headerToken;
    }
    if (Array.isArray(headerToken) && headerToken[0]) {
        return headerToken[0];
    }
    const dataToken = response.data?.csrfToken;
    if (typeof dataToken === 'string' && dataToken.trim().length > 0) {
        return dataToken;
    }
    return null;
};

const fetchCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await apiClient.get<{ csrfToken?: string }>('/auth/csrf/');
        return extractTokenFromResponse(response);
    } catch (error) {
        console.error('Не удалось получить CSRF токен', error);
        return null;
    }
};

const ensureCsrfToken = async () => {
    if (csrfToken) {
        return csrfToken;
    }
    if (!csrfRefreshPromise) {
        csrfRefreshPromise = fetchCsrfToken().finally(() => {
            csrfRefreshPromise = null;
        });
    }
    csrfToken = await csrfRefreshPromise;
    return csrfToken;
};

const resolveApiBaseUrl = (): string => {
    const fallback = '/api';
    const raw = env.apiBaseUrl?.trim();

    if (!raw) {
        return fallback;
    }

    if (raw.startsWith('/')) {
        return raw;
    }

    try {
        const url = new URL(raw);
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin;
            if (url.origin !== currentOrigin && !env.apiAllowCrossOrigin) {
                console.warn(
                    `VITE_API_BASE_URL origin (${url.origin}) doesn't match current origin (${currentOrigin}). ` +
                    `Falling back to ${fallback} to avoid CSRF trusted origins issues. ` +
                    'Set VITE_API_ALLOW_CROSS_ORIGIN=1 to force the provided base URL.'
                );
                return fallback;
            }
        }
        return url.toString();
    } catch (error) {
        console.warn(`Invalid VITE_API_BASE_URL value "${raw}". Falling back to ${fallback}.`, error);
        return fallback;
    }
};

export const apiClient = axios.create({
    baseURL: resolveApiBaseUrl(),
    withCredentials: true,
    timeout: 10_000
});

apiClient.interceptors.request.use(async (config) => {
  const typedConfig = config as RequestConfigWithMeta;
  const headers = ensureHeaders(config);
  if (inMemoryToken) {
    headers.set('Authorization', `Token ${inMemoryToken}`);
  }
  const method = (config.method ?? 'get').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      headers.set('X-CSRFToken', token);
      headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    typedConfig.metadata = {retryCount: 0, signature};
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        const headerToken = response.headers?.['x-csrftoken'];
        if (typeof headerToken === 'string' && headerToken.trim().length > 0) {
            csrfToken = headerToken;
        } else if (Array.isArray(headerToken) && headerToken[0]) {
            csrfToken = headerToken[0];
        }
        return response;
    },
    async (error: AxiosError) => {
        const status = error?.response?.status;
        const config = error.config as RequestConfigWithMeta | undefined;
        const metadata = config?.metadata ?? {retryCount: 0};

        if (status === 401) {
            notificationBus.publish({
                type: 'warning',
                title: 'Сессия истекла',
                message: 'Пожалуйста, войдите снова для продолжения работы.'
            });
        }

        if (status === 403 && config) {
            const detail = (error.response?.data as { detail?: string } | undefined)?.detail ?? '';
            if (!metadata.csrfRetried && detail.toLowerCase().includes('csrf')) {
                metadata.csrfRetried = true;
                csrfToken = null;
                const freshToken = await ensureCsrfToken();
                if (freshToken) {
                    const retryHeaders = ensureHeaders(config);
                    retryHeaders.set('X-CSRFToken', freshToken);
                    retryHeaders.set('X-Requested-With', 'XMLHttpRequest');
                    config.metadata = metadata;
                    return apiClient(config);
                }
            }
        }

        if (status === 429 || status === 423) {
            const retryAfter = error.response?.headers?.['retry-after'];
            notificationBus.publish({
                type: 'info',
                title: 'Временная задержка',
                message: retryAfter
                    ? `Повторите запрос через ${retryAfter} сек.`
                    : 'Достигнут лимит запросов. Попробуйте позже.'
            });
        }

        if (config && status && [429, 423, 503].includes(status)) {
            if (metadata.retryCount < env.apiMaxRetries) {
                metadata.retryCount += 1;
                config.metadata = metadata;
                const retryAfterHeader = error.response?.headers?.['retry-after'];
                const retryAfterSeconds = Array.isArray(retryAfterHeader)
                    ? Number.parseInt(retryAfterHeader[0] ?? '', 10)
                    : Number.parseInt(retryAfterHeader ?? '', 10);
                const exponentialDelay = env.apiRetryBaseDelayMs * metadata.retryCount ** 2;
                const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                    ? retryAfterSeconds * 1000
                    : exponentialDelay;
                await sleep(retryDelay);
                return apiClient(config);
            }
        }

        return Promise.reject(error);
    }
);
