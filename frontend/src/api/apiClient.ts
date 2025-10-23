import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from './config/env';
import { notificationBus } from '../components/notifications/notificationBus';

let inMemoryToken: string | null = null;

interface RequestMetadata {
  retryCount: number;
  signature?: string;
}

type RequestConfigWithMeta = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
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

apiClient.interceptors.request.use((config) => {
  const typedConfig = config as RequestConfigWithMeta;
  if (inMemoryToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${inMemoryToken}`
    };
  }
  const signature = createSignature(config);
  if (signature) {
    config.headers = {
      ...config.headers,
      'X-Request-Signature': signature
    };
  }
  typedConfig.metadata = { retryCount: 0, signature };
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const config = error.config as RequestConfigWithMeta | undefined;
    const metadata = config?.metadata ?? { retryCount: 0 };

    if (status === 401) {
      notificationBus.publish({
        type: 'warning',
        title: 'Сессия истекла',
        message: 'Пожалуйста, войдите снова для продолжения работы.'
      });
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
