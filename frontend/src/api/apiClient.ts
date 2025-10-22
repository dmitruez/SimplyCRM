import axios from 'axios';

import { env } from './config/env';
import { notificationBus } from '../components/notifications/notificationBus';

let inMemoryToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl || '/api',
  withCredentials: true,
  timeout: 10_000
});

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${inMemoryToken}`
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

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

    return Promise.reject(error);
  }
);
