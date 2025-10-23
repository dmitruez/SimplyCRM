# SimplyCRM Frontend

React + TypeScript SPA для SimplyCRM, повторяющая план развития фронтенда.

## Стек

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- React Router v6 для маршрутизации
- React Query для работы с REST API и кэшированием
- Axios с перехватчиками авторизации и обработки лимитов
- CSS Modules с дизайн-токенами
- ESLint + Prettier для форматирования

## Быстрый старт

```bash
cd frontend
npm install
npm run dev
```

По умолчанию API проксируется на `http://localhost:8000`. Настройте `.env`:

```bash
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8000
# VITE_GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
# VITE_API_MAX_RETRIES=2
# VITE_API_RETRY_BASE_DELAY_MS=800
```

## Структура

- `src/routes` — маршрутизация и защищённые зоны
- `src/providers` — глобальные провайдеры авторизации и запросов
- `src/components/ui` — дизайн-система (кнопки, карточки, плитки метрик)
- `src/pages` — публичные и приватные страницы (Главная, Тарифы, CRM, Авторизация)
- `src/sections` — ленивые модули CRM (Каталог, Продажи, Аналитика, Автоматизация, Интеграции, AI-ассистент)
- `src/api` — слой API-клиента и эндпоинтов
- `src/styles` — дизайн-токены и глобальные стили

## Аутентификация и безопасность

- Реализована полная регистрация пользователей с созданием организации и выбором тарифного плана.
- Поддержан вход и регистрация через Google Identity Services с валидацией ID token на бэкенде.
- Axios-клиент добавляет сигнатуру запросов, использует экспоненциальный бэкофф для ответов 429/423/503 и предотвращает повторные отправки.
- В `AuthProvider` реализовано хранение токена в памяти и автоматическое обновление профиля пользователя.
- Бэкенд дополнили адаптивным лимитированием и дедупликацией запросов по `X-Request-Signature` для защиты от DDoS.

## Следующие шаги

- Подключить Storybook и E2E тесты (Playwright/Cypress)
- Настроить CI (lint, unit, dependency audit) и деплой на CDN
- Расширить список социальных провайдеров и интеграцию с платежными сервисами
- Включить мониторинг фронтенда (Sentry/LogRocket) и метрики Web Vitals
