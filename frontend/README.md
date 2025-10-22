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
```

## Структура

- `src/routes` — маршрутизация и защищённые зоны
- `src/providers` — глобальные провайдеры авторизации и запросов
- `src/components/ui` — дизайн-система (кнопки, карточки, плитки метрик)
- `src/pages` — публичные и приватные страницы (Главная, Тарифы, CRM, Авторизация)
- `src/sections` — ленивые модули CRM (Каталог, Продажи, Аналитика, Автоматизация, Интеграции, AI-ассистент)
- `src/api` — слой API-клиента и эндпоинтов
- `src/styles` — дизайн-токены и глобальные стили

## Следующие шаги

- Подключить Storybook и E2E тесты (Playwright/Cypress)
- Настроить CI (lint, unit, dependency audit) и деплой на CDN
- Добавить интеграцию с Google Identity Services и платежными провайдерами
- Включить мониторинг фронтенда (Sentry/LogRocket) и метрики Web Vitals
