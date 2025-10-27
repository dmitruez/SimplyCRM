import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import styles from './ApiAccessPage.module.css';
import { billingApi } from '../api/billing';
import { Button } from '../components/ui/Button';
import { notificationBus } from '../components/notifications/notificationBus';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiOperation = {
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  displayMethod?: string;
};

type ApiResource = {
  name: string;
  description: string;
  basePath: string;
  operations: ApiOperation[];
  feature?: string;
};

type ApiSection = {
  id: string;
  name: string;
  description: string;
  basePath: string;
  resources: ApiResource[];
};

const methodClassName: Record<HttpMethod, string> = {
  GET: 'methodGET',
  POST: 'methodPOST',
  PUT: 'methodPUT',
  PATCH: 'methodPATCH',
  DELETE: 'methodDELETE'
};

const API_SECTIONS: ApiSection[] = [
  {
    id: 'catalog',
    name: 'Catalog API',
    description: 'Управляйте карточками товаров, категориями и запасами каталога.',
    basePath: '/api/catalog/',
    resources: [
      {
        name: 'Категории товаров',
        description: 'Группируйте товары и стройте иерархии категорий для каталога.',
        basePath: '/api/catalog/categories/',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/categories/',
            title: 'Список категорий',
            description: 'Возвращает категории организации с поддержкой пагинации и поиска по названию.'
          },
          {
            method: 'POST',
            path: '/api/catalog/categories/',
            title: 'Создать категорию',
            description: 'Добавляет новую категорию. Поля: name, parent (опционально).'
          },
          {
            method: 'GET',
            path: '/api/catalog/categories/{id}/',
            title: 'Получить категорию',
            description: 'Возвращает подробную информацию о категории по идентификатору.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/catalog/categories/{id}/',
            title: 'Обновить категорию',
            description: 'Изменяет название, описание или родителя существующей категории.'
          },
          {
            method: 'DELETE',
            path: '/api/catalog/categories/{id}/',
            title: 'Удалить категорию',
            description: 'Удаляет категорию и отвязывает её от связанных товаров.'
          }
        ]
      },
      {
        name: 'Поставщики',
        description: 'Ведите учёт партнёров и поставщиков для цепочки поставок.',
        basePath: '/api/catalog/suppliers/',
        feature: 'Требуется опция тарифа «Управление поставщиками».',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/suppliers/',
            title: 'Список поставщиков',
            description: 'Получает всех поставщиков организации с фильтрами по активности.'
          },
          {
            method: 'POST',
            path: '/api/catalog/suppliers/',
            title: 'Создать поставщика',
            description: 'Создаёт карточку поставщика с контактами и реквизитами.'
          },
          {
            method: 'GET',
            path: '/api/catalog/suppliers/{id}/',
            title: 'Получить поставщика',
            description: 'Возвращает подробности поставщика, включая статистику заказов.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/catalog/suppliers/{id}/',
            title: 'Обновить поставщика',
            description: 'Редактирует контактные данные и статус поставщика.'
          },
          {
            method: 'DELETE',
            path: '/api/catalog/suppliers/{id}/',
            title: 'Удалить поставщика',
            description: 'Удаляет поставщика и связанные с ним записи каталога.'
          }
        ]
      },
      {
        name: 'Товары',
        description: 'Создавайте карточки товаров и обновляйте ассортимент.',
        basePath: '/api/catalog/products/',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/products/',
            title: 'Список товаров',
            description: 'Возвращает товары с параметрами фильтрации по категории, поставщику и статусу.'
          },
          {
            method: 'POST',
            path: '/api/catalog/products/',
            title: 'Создать товар',
            description: 'Добавляет карточку товара. Поддерживает multipart-загрузку медиа.'
          },
          {
            method: 'GET',
            path: '/api/catalog/products/{id}/',
            title: 'Получить товар',
            description: 'Возвращает подробную информацию о товаре и его вариантах.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/catalog/products/{id}/',
            title: 'Обновить товар',
            description: 'Редактирует цены, описание, набор атрибутов и привязку к категориям.'
          },
          {
            method: 'DELETE',
            path: '/api/catalog/products/{id}/',
            title: 'Удалить товар',
            description: 'Удаляет карточку товара и связанные варианты.'
          }
        ]
      },
      {
        name: 'Варианты товара',
        description: 'Управляйте SKU и характеристиками каждого варианта товара.',
        basePath: '/api/catalog/product-variants/',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/product-variants/',
            title: 'Список вариантов',
            description: 'Возвращает варианты товаров с фильтрами по SKU и доступности.'
          },
          {
            method: 'POST',
            path: '/api/catalog/product-variants/',
            title: 'Создать вариант',
            description: 'Добавляет новый вариант товара с собственным SKU и атрибутами.'
          },
          {
            method: 'GET',
            path: '/api/catalog/product-variants/{id}/',
            title: 'Получить вариант',
            description: 'Возвращает конкретный вариант товара.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/catalog/product-variants/{id}/',
            title: 'Обновить вариант',
            description: 'Обновляет SKU, цену и дополнительные свойства варианта.'
          },
          {
            method: 'DELETE',
            path: '/api/catalog/product-variants/{id}/',
            title: 'Удалить вариант',
            description: 'Удаляет вариант и связанные данные о запасах.'
          }
        ]
      },
      {
        name: 'Партионный учёт',
        description: 'Отслеживайте остатки по партиям и срокам годности.',
        basePath: '/api/catalog/inventory-lots/',
        feature: 'Требуется опция тарифа «Расширенный складской учёт».',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/inventory-lots/',
            title: 'Список партий',
            description: 'Возвращает партии товаров с остатками и местоположениями склада.'
          },
          {
            method: 'POST',
            path: '/api/catalog/inventory-lots/',
            title: 'Создать партию',
            description: 'Добавляет новую партию с количеством, сроком годности и складом.'
          },
          {
            method: 'GET',
            path: '/api/catalog/inventory-lots/{id}/',
            title: 'Получить партию',
            description: 'Возвращает подробности партии и историю движения.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/catalog/inventory-lots/{id}/',
            title: 'Обновить партию',
            description: 'Корректирует остатки, локации и метаданные партии.'
          },
          {
            method: 'DELETE',
            path: '/api/catalog/inventory-lots/{id}/',
            title: 'Удалить партию',
            description: 'Удаляет партию и фиксирует выбытие запасов.'
          }
        ]
      },
      {
        name: 'История цен',
        description: 'Отслеживайте изменения цен на уровне вариантов товара.',
        basePath: '/api/catalog/price-history/',
        feature: 'Только чтение. Требуется опция «История цен».',
        operations: [
          {
            method: 'GET',
            path: '/api/catalog/price-history/',
            title: 'Хронология цен',
            description: 'Возвращает историю изменения цен с фильтрами по варианту и интервалу дат.'
          },
          {
            method: 'GET',
            path: '/api/catalog/price-history/{id}/',
            title: 'Получить запись',
            description: 'Возвращает конкретную запись изменения цены.'
          }
        ]
      }
    ]
  },
  {
    id: 'sales',
    name: 'Sales API',
    description: 'Используйте CRM-данные для лидов, сделок и заказов.',
    basePath: '/api/sales/',
    resources: [
      {
        name: 'Компании',
        description: 'Карточки организаций-клиентов.',
        basePath: '/api/sales/companies/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/companies/',
            title: 'Список компаний',
            description: 'Постраничный список компаний с фильтрами по отрасли и менеджеру.'
          },
          {
            method: 'POST',
            path: '/api/sales/companies/',
            title: 'Создать компанию',
            description: 'Добавляет новую компанию с реквизитами и основным контактом.'
          },
          {
            method: 'GET',
            path: '/api/sales/companies/{id}/',
            title: 'Получить компанию',
            description: 'Возвращает карточку компании и связанные сделки.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/companies/{id}/',
            title: 'Обновить компанию',
            description: 'Изменяет ответственного менеджера, сегмент и реквизиты.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/companies/{id}/',
            title: 'Удалить компанию',
            description: 'Удаляет компанию и необязательные связи с лидами.'
          }
        ]
      },
      {
        name: 'Контакты',
        description: 'Контактные лица клиентов и партнёров.',
        basePath: '/api/sales/contacts/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/contacts/',
            title: 'Список контактов',
            description: 'Возвращает контакты с фильтрами по должности, компании и активности.'
          },
          {
            method: 'POST',
            path: '/api/sales/contacts/',
            title: 'Создать контакт',
            description: 'Добавляет контакт с полями имени, email, телефона и статуса.'
          },
          {
            method: 'GET',
            path: '/api/sales/contacts/{id}/',
            title: 'Получить контакт',
            description: 'Возвращает данные контакта и связанные сделки.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/contacts/{id}/',
            title: 'Обновить контакт',
            description: 'Редактирует контактные данные, теги и ответственного менеджера.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/contacts/{id}/',
            title: 'Удалить контакт',
            description: 'Удаляет контакт и связанные напоминания.'
          }
        ]
      },
      {
        name: 'Воронки и этапы',
        description: 'Управляйте продажами в нескольких воронках.',
        basePath: '/api/sales/pipelines/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/pipelines/',
            title: 'Список воронок',
            description: 'Возвращает воронки продаж с этапами и лимитами.'
          },
          {
            method: 'POST',
            path: '/api/sales/pipelines/',
            title: 'Создать воронку',
            description: 'Создаёт новую воронку с параметрами: name, currency, is_default.'
          },
          {
            method: 'GET',
            path: '/api/sales/pipelines/{id}/',
            title: 'Получить воронку',
            description: 'Возвращает данные воронки и связанные этапы.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/pipelines/{id}/',
            title: 'Обновить воронку',
            description: 'Изменяет название, валюту и порядок этапов.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/pipelines/{id}/',
            title: 'Удалить воронку',
            description: 'Удаляет воронку и архивирует связанные сделки.'
          }
        ]
      },
      {
        name: 'Этапы сделок',
        description: 'Управляйте шагами внутри каждой воронки.',
        basePath: '/api/sales/deal-stages/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/deal-stages/',
            title: 'Список этапов',
            description: 'Возвращает этапы для выбранной воронки.'
          },
          {
            method: 'POST',
            path: '/api/sales/deal-stages/',
            title: 'Создать этап',
            description: 'Добавляет этап с полями name, probability, order.'
          },
          {
            method: 'GET',
            path: '/api/sales/deal-stages/{id}/',
            title: 'Получить этап',
            description: 'Возвращает один этап сделки.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/deal-stages/{id}/',
            title: 'Обновить этап',
            description: 'Изменяет вероятность, название и порядок.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/deal-stages/{id}/',
            title: 'Удалить этап',
            description: 'Удаляет этап и переводит сделки в следующий этап.'
          }
        ]
      },
      {
        name: 'Лиды',
        description: 'Первичные обращения и потенциальные клиенты.',
        basePath: '/api/sales/leads/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/leads/',
            title: 'Список лидов',
            description: 'Возвращает лиды с фильтрами по статусу и источнику.'
          },
          {
            method: 'POST',
            path: '/api/sales/leads/',
            title: 'Создать лид',
            description: 'Добавляет лид с информацией о канале привлечения.'
          },
          {
            method: 'GET',
            path: '/api/sales/leads/{id}/',
            title: 'Получить лид',
            description: 'Возвращает карточку лида и историю активности.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/leads/{id}/',
            title: 'Обновить лид',
            description: 'Изменяет статус, ответственного и конверсию в сделку.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/leads/{id}/',
            title: 'Удалить лид',
            description: 'Удаляет лид и связанные задачи.'
          }
        ]
      },
      {
        name: 'Сделки и возможности',
        description: 'Работа со сделками, прогнозом и активностями.',
        basePath: '/api/sales/opportunities/',
        feature: 'Требуется опция тарифа «Расширенные воронки».',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/opportunities/',
            title: 'Список сделок',
            description: 'Возвращает сделки с фильтрами по этапу, сумме и владельцу.'
          },
          {
            method: 'POST',
            path: '/api/sales/opportunities/',
            title: 'Создать сделку',
            description: 'Создаёт сделку с суммой, стадией и ожидаемой датой закрытия.'
          },
          {
            method: 'GET',
            path: '/api/sales/opportunities/{id}/',
            title: 'Получить сделку',
            description: 'Возвращает карточку сделки с историей коммуникаций.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/opportunities/{id}/',
            title: 'Обновить сделку',
            description: 'Меняет стадию, вероятность и прогнозируемый доход.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/opportunities/{id}/',
            title: 'Удалить сделку',
            description: 'Удаляет сделку и связанные активности.'
          }
        ]
      },
      {
        name: 'Активности по сделкам',
        description: 'Задачи, встречи и коммуникации внутри сделки.',
        basePath: '/api/sales/deal-activities/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/deal-activities/',
            title: 'Список активностей',
            description: 'Возвращает активности с фильтрами по типу, ответственного и статусу.'
          },
          {
            method: 'POST',
            path: '/api/sales/deal-activities/',
            title: 'Создать активность',
            description: 'Создаёт активность в привязке к сделке.'
          },
          {
            method: 'GET',
            path: '/api/sales/deal-activities/{id}/',
            title: 'Получить активность',
            description: 'Возвращает подробности активности и протокол выполнения.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/deal-activities/{id}/',
            title: 'Обновить активность',
            description: 'Изменяет сроки, ответственных и статусы активности.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/deal-activities/{id}/',
            title: 'Удалить активность',
            description: 'Удаляет активность и связанные напоминания.'
          }
        ]
      },
      {
        name: 'Заказы',
        description: 'Создавайте заказы и отслеживайте их выполнение.',
        basePath: '/api/sales/orders/',
        feature: 'Требуется опция тарифа «Управление заказами».',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/orders/',
            title: 'Список заказов',
            description: 'Возвращает заказы с фильтрами по статусу, клиенту и периоду.'
          },
          {
            method: 'POST',
            path: '/api/sales/orders/',
            title: 'Создать заказ',
            description: 'Создаёт заказ из сделки или напрямую по клиенту.'
          },
          {
            method: 'GET',
            path: '/api/sales/orders/{id}/',
            title: 'Получить заказ',
            description: 'Возвращает карточку заказа с составом и платежами.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/orders/{id}/',
            title: 'Обновить заказ',
            description: 'Изменяет статус, даты исполнения и данные доставки.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/orders/{id}/',
            title: 'Удалить заказ',
            description: 'Отменяет заказ и освобождает бронь товаров.'
          }
        ]
      },
      {
        name: 'Строки заказа',
        description: 'Управляйте списком товаров внутри заказа.',
        basePath: '/api/sales/order-lines/',
        feature: 'Доступно в модуле «Управление заказами».',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/order-lines/',
            title: 'Список строк',
            description: 'Возвращает строки заказов с ссылкой на товар и цену.'
          },
          {
            method: 'POST',
            path: '/api/sales/order-lines/',
            title: 'Добавить строку',
            description: 'Добавляет товар в заказ с количеством и скидкой.'
          },
          {
            method: 'GET',
            path: '/api/sales/order-lines/{id}/',
            title: 'Получить строку',
            description: 'Возвращает выбранную строку заказа.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/order-lines/{id}/',
            title: 'Обновить строку',
            description: 'Изменяет количество, цену, налоги и скидки.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/order-lines/{id}/',
            title: 'Удалить строку',
            description: 'Удаляет строку из заказа и пересчитывает итоговую сумму.'
          }
        ]
      },
      {
        name: 'Счета и платежи',
        description: 'Финансовые документы по заказам.',
        basePath: '/api/sales/invoices/',
        feature: 'Счета требуют опцию «Выставление счетов», платежи — «Приём платежей».',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/invoices/',
            title: 'Список счетов',
            description: 'Возвращает счета с фильтрами по статусу оплаты и диапазону дат.'
          },
          {
            method: 'POST',
            path: '/api/sales/invoices/',
            title: 'Создать счёт',
            description: 'Формирует счёт для заказа с реквизитами и сроками оплаты.'
          },
          {
            method: 'GET',
            path: '/api/sales/invoices/{id}/',
            title: 'Получить счёт',
            description: 'Возвращает счёт, прикреплённые платежи и PDF-ссылку.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/invoices/{id}/',
            title: 'Обновить счёт',
            description: 'Изменяет статус, дату оплаты и комментарии.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/invoices/{id}/',
            title: 'Удалить счёт',
            description: 'Удаляет счёт и аннулирует связанные платежи.'
          },
          {
            method: 'GET',
            path: '/api/sales/payments/',
            title: 'Список платежей',
            description: 'Возвращает платежи с фильтрами по методу и статусу.'
          },
          {
            method: 'POST',
            path: '/api/sales/payments/',
            title: 'Зарегистрировать платеж',
            description: 'Создаёт запись о поступившем платеже по счёту.'
          },
          {
            method: 'GET',
            path: '/api/sales/payments/{id}/',
            title: 'Получить платеж',
            description: 'Возвращает подробности платежа и связанные документы.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/payments/{id}/',
            title: 'Обновить платеж',
            description: 'Изменяет статус (проведён, возврат) и сумму.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/payments/{id}/',
            title: 'Удалить платеж',
            description: 'Удаляет запись о платеже и корректирует баланс счёта.'
          }
        ]
      },
      {
        name: 'Отгрузки',
        description: 'Контролируйте логистику и статусы отгрузок.',
        basePath: '/api/sales/shipments/',
        feature: 'Требуется опция тарифа «Управление отгрузками».',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/shipments/',
            title: 'Список отгрузок',
            description: 'Возвращает отгрузки с фильтрами по статусу и службе доставки.'
          },
          {
            method: 'POST',
            path: '/api/sales/shipments/',
            title: 'Создать отгрузку',
            description: 'Регистрирует отгрузку по заказу, включая трек-номер.'
          },
          {
            method: 'GET',
            path: '/api/sales/shipments/{id}/',
            title: 'Получить отгрузку',
            description: 'Возвращает информацию об отгрузке и истории статусов.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/shipments/{id}/',
            title: 'Обновить отгрузку',
            description: 'Обновляет статус доставки, даты и примечания.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/shipments/{id}/',
            title: 'Удалить отгрузку',
            description: 'Отменяет отгрузку и освобождает зарезервированный товар.'
          }
        ]
      },
      {
        name: 'Заметки',
        description: 'Свободные заметки по клиентам, сделкам и лидам.',
        basePath: '/api/sales/notes/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/notes/',
            title: 'Список заметок',
            description: 'Возвращает заметки с сортировкой по полю ordering (например, -created_at).'
          },
          {
            method: 'POST',
            path: '/api/sales/notes/',
            title: 'Создать заметку',
            description: 'Создаёт заметку и автоматически привязывает автора.'
          },
          {
            method: 'GET',
            path: '/api/sales/notes/{id}/',
            title: 'Получить заметку',
            description: 'Возвращает заметку по идентификатору.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/notes/{id}/',
            title: 'Обновить заметку',
            description: 'Изменяет текст заметки. Автор и организация фиксируются автоматически.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/notes/{id}/',
            title: 'Удалить заметку',
            description: 'Удаляет заметку без удаления связанных сущностей.'
          }
        ]
      },
      {
        name: 'Вложения',
        description: 'Файлы, связанные с клиентами и сделками.',
        basePath: '/api/sales/attachments/',
        operations: [
          {
            method: 'GET',
            path: '/api/sales/attachments/',
            title: 'Список вложений',
            description: 'Возвращает вложения с фильтрами по типу и владельцу.'
          },
          {
            method: 'POST',
            path: '/api/sales/attachments/',
            title: 'Загрузить вложение',
            description: 'Принимает multipart/form-data с файлом и связанной сущностью.'
          },
          {
            method: 'GET',
            path: '/api/sales/attachments/{id}/',
            title: 'Получить вложение',
            description: 'Возвращает метаданные вложения и ссылку на скачивание.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/sales/attachments/{id}/',
            title: 'Обновить вложение',
            description: 'Позволяет переименовать файл и обновить описание.'
          },
          {
            method: 'DELETE',
            path: '/api/sales/attachments/{id}/',
            title: 'Удалить вложение',
            description: 'Удаляет файл и метаданные вложения.'
          }
        ]
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics API',
    description: 'Получайте доступ к метрикам, отчётам и продвинутой аналитике.',
    basePath: '/api/analytics/',
    resources: [
      {
        name: 'Определения метрик',
        description: 'Настраиваемые расчётные показатели.',
        basePath: '/api/analytics/metric-definitions/',
        feature: 'Требуется опция «Пользовательские метрики».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/metric-definitions/',
            title: 'Список метрик',
            description: 'Возвращает пользовательские метрики организации.'
          },
          {
            method: 'POST',
            path: '/api/analytics/metric-definitions/',
            title: 'Создать метрику',
            description: 'Создаёт вычисляемую метрику на основе формулы или запроса.'
          },
          {
            method: 'GET',
            path: '/api/analytics/metric-definitions/{id}/',
            title: 'Получить метрику',
            description: 'Возвращает описание метрики и параметры агрегации.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/metric-definitions/{id}/',
            title: 'Обновить метрику',
            description: 'Изменяет формулу, период и параметры фильтрации.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/metric-definitions/{id}/',
            title: 'Удалить метрику',
            description: 'Удаляет метрику и связанные дашборды.'
          }
        ]
      },
      {
        name: 'Дашборды',
        description: 'Готовые наборы виджетов и диаграмм.',
        basePath: '/api/analytics/dashboards/',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/dashboards/',
            title: 'Список дашбордов',
            description: 'Возвращает дашборды с виджетами и уровнями доступа.'
          },
          {
            method: 'POST',
            path: '/api/analytics/dashboards/',
            title: 'Создать дашборд',
            description: 'Создаёт дашборд и связывает его с метриками и фильтрами.'
          },
          {
            method: 'GET',
            path: '/api/analytics/dashboards/{id}/',
            title: 'Получить дашборд',
            description: 'Возвращает состав дашборда и настройки доступа.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/dashboards/{id}/',
            title: 'Обновить дашборд',
            description: 'Изменяет компоновку виджетов и фильтры.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/dashboards/{id}/',
            title: 'Удалить дашборд',
            description: 'Удаляет дашборд и связанные подписки.'
          }
        ]
      },
      {
        name: 'Отчёты',
        description: 'Плановые и автоматические отчёты.',
        basePath: '/api/analytics/reports/',
        feature: 'Требуется опция «Автоматические отчёты».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/reports/',
            title: 'Список отчётов',
            description: 'Возвращает отчёты с расписанием и получателями.'
          },
          {
            method: 'POST',
            path: '/api/analytics/reports/',
            title: 'Создать отчёт',
            description: 'Создаёт отчёт с фильтрами, шаблоном и расписанием отправки.'
          },
          {
            method: 'GET',
            path: '/api/analytics/reports/{id}/',
            title: 'Получить отчёт',
            description: 'Возвращает параметры отчёта и историю отправок.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/reports/{id}/',
            title: 'Обновить отчёт',
            description: 'Изменяет расписание, фильтры и шаблон отчёта.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/reports/{id}/',
            title: 'Удалить отчёт',
            description: 'Удаляет отчёт и связанные задачи планировщика.'
          }
        ]
      },
      {
        name: 'Insights',
        description: 'Автоматические инсайты и прогнозы.',
        basePath: '/api/analytics/insights/',
        feature: 'Требуется опция «Продвинутая аналитика и инсайты».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/insights/rfm/',
            title: 'RFM сегментация',
            description: 'Возвращает список клиентов с RFM-оценкой.'
          },
          {
            method: 'GET',
            path: '/api/analytics/insights/sales-metrics/',
            title: 'Сводные метрики продаж',
            description: 'Возвращает агрегированные показатели по выручке и конверсии.'
          },
          {
            method: 'GET',
            path: '/api/analytics/insights/anomalies/',
            title: 'Поиск аномалий',
            description: 'Выявляет аномальные изменения в продажах.'
          },
          {
            method: 'GET',
            path: '/api/analytics/insights/price-recommendations/',
            title: 'Рекомендации цен',
            description: 'Возвращает рекомендации по корректировке цен.'
          },
          {
            method: 'GET',
            path: '/api/analytics/insights/demand-forecast/',
            title: 'Прогноз спроса',
            description: 'Выдаёт прогноз продаж по SKU на период вперёд.'
          },
          {
            method: 'GET',
            path: '/api/analytics/insights/next-best-actions/',
            title: 'Следующие лучшие действия',
            description: 'Предлагает персональные действия для менеджеров.'
          }
        ]
      },
      {
        name: 'Прогнозы',
        description: 'ML-модели и тренды по продажам.',
        basePath: '/api/analytics/forecasts/',
        feature: 'Требуется опция «Прогнозирование».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/forecasts/',
            title: 'Список прогнозов',
            description: 'Возвращает прогнозы с периодичностью и точностью.'
          },
          {
            method: 'POST',
            path: '/api/analytics/forecasts/',
            title: 'Создать прогноз',
            description: 'Запускает новую прогнозную модель.'
          },
          {
            method: 'GET',
            path: '/api/analytics/forecasts/{id}/',
            title: 'Получить прогноз',
            description: 'Возвращает значения прогноза и доверительные интервалы.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/forecasts/{id}/',
            title: 'Обновить прогноз',
            description: 'Обновляет параметры модели и горизонта прогноза.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/forecasts/{id}/',
            title: 'Удалить прогноз',
            description: 'Удаляет прогноз и связанные задачи обновления.'
          }
        ]
      },
      {
        name: 'Клиентские сегменты',
        description: 'Динамические сегменты клиентов.',
        basePath: '/api/analytics/customer-segments/',
        feature: 'Требуется опция «Сегментация клиентов».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/customer-segments/',
            title: 'Список сегментов',
            description: 'Возвращает сегменты с условиями отбора.'
          },
          {
            method: 'POST',
            path: '/api/analytics/customer-segments/',
            title: 'Создать сегмент',
            description: 'Создаёт новый сегмент по критериям поведения и продаж.'
          },
          {
            method: 'GET',
            path: '/api/analytics/customer-segments/{id}/',
            title: 'Получить сегмент',
            description: 'Возвращает параметры сегмента и список участников.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/customer-segments/{id}/',
            title: 'Обновить сегмент',
            description: 'Изменяет критерии отбора и период обновления.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/customer-segments/{id}/',
            title: 'Удалить сегмент',
            description: 'Удаляет сегмент и связанные автоматизации.'
          }
        ]
      },
      {
        name: 'MLOps',
        description: 'Контроль запусков и обучений моделей.',
        basePath: '/api/analytics/model-training-runs/',
        feature: 'Требуется опция «ML-операции».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/model-training-runs/',
            title: 'Список запусков',
            description: 'Возвращает истории обучений моделей.'
          },
          {
            method: 'POST',
            path: '/api/analytics/model-training-runs/',
            title: 'Запустить обучение',
            description: 'Запускает процесс обучения модели.'
          },
          {
            method: 'GET',
            path: '/api/analytics/model-training-runs/{id}/',
            title: 'Получить запуск',
            description: 'Возвращает метрики и состояние обучения.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/model-training-runs/{id}/',
            title: 'Обновить запуск',
            description: 'Позволяет перезапустить или отменить обучение.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/model-training-runs/{id}/',
            title: 'Удалить запуск',
            description: 'Удаляет запись о запуске и связанные артефакты.'
          }
        ]
      },
      {
        name: 'Источники данных',
        description: 'Подключения к внешним источникам данных.',
        basePath: '/api/analytics/data-sources/',
        feature: 'Требуется опция «Интеграции аналитики».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/data-sources/',
            title: 'Список источников',
            description: 'Возвращает источники данных и статусы синхронизаций.'
          },
          {
            method: 'POST',
            path: '/api/analytics/data-sources/',
            title: 'Создать источник',
            description: 'Создаёт подключение к BI, складу данных или файлу.'
          },
          {
            method: 'GET',
            path: '/api/analytics/data-sources/{id}/',
            title: 'Получить источник',
            description: 'Возвращает параметры подключения и расписание обновлений.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/analytics/data-sources/{id}/',
            title: 'Обновить источник',
            description: 'Изменяет параметры подключения и авторизации.'
          },
          {
            method: 'DELETE',
            path: '/api/analytics/data-sources/{id}/',
            title: 'Удалить источник',
            description: 'Удаляет источник и связанные задачи синхронизации.'
          }
        ]
      },
      {
        name: 'Журналы синхронизаций',
        description: 'История обмена данными с подключёнными источниками.',
        basePath: '/api/analytics/data-sync-logs/',
        feature: 'Только чтение. Требуется опция «Интеграции аналитики».',
        operations: [
          {
            method: 'GET',
            path: '/api/analytics/data-sync-logs/',
            title: 'Список синхронизаций',
            description: 'Возвращает журналы синхронизаций по источникам данных.'
          },
          {
            method: 'GET',
            path: '/api/analytics/data-sync-logs/{id}/',
            title: 'Получить запись журнала',
            description: 'Возвращает детали конкретного запуска синхронизации.'
          }
        ]
      }
    ]
  },
  {
    id: 'automation',
    name: 'Automation API',
    description: 'Настраивайте правила автоматизации, кампании и уведомления.',
    basePath: '/api/automation/',
    resources: [
      {
        name: 'Правила автоматизации',
        description: 'Запускайте действия по условиям и триггерам.',
        basePath: '/api/automation/automation-rules/',
        feature: 'Требуется опция «Автоматизация процессов».',
        operations: [
          {
            method: 'GET',
            path: '/api/automation/automation-rules/',
            title: 'Список правил',
            description: 'Возвращает правила автоматизации с фильтрацией по статусу.'
          },
          {
            method: 'POST',
            path: '/api/automation/automation-rules/',
            title: 'Создать правило',
            description: 'Создаёт правило с триггером, условиями и действиями.'
          },
          {
            method: 'GET',
            path: '/api/automation/automation-rules/{id}/',
            title: 'Получить правило',
            description: 'Возвращает конфигурацию правила и журнал срабатываний.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/automation/automation-rules/{id}/',
            title: 'Обновить правило',
            description: 'Изменяет триггеры, условия и активирует или деактивирует правило.'
          },
          {
            method: 'DELETE',
            path: '/api/automation/automation-rules/{id}/',
            title: 'Удалить правило',
            description: 'Удаляет правило и прекращает его выполнение.'
          }
        ]
      },
      {
        name: 'Кампании',
        description: 'Автоматические последовательности коммуникаций.',
        basePath: '/api/automation/campaigns/',
        feature: 'Требуется опция «Маркетинговые кампании».',
        operations: [
          {
            method: 'GET',
            path: '/api/automation/campaigns/',
            title: 'Список кампаний',
            description: 'Возвращает кампании с статусами и конверсиями.'
          },
          {
            method: 'POST',
            path: '/api/automation/campaigns/',
            title: 'Создать кампанию',
            description: 'Создаёт кампанию с аудиторией, расписанием и шагами.'
          },
          {
            method: 'GET',
            path: '/api/automation/campaigns/{id}/',
            title: 'Получить кампанию',
            description: 'Возвращает кампанию с шагами и показателями эффективности.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/automation/campaigns/{id}/',
            title: 'Обновить кампанию',
            description: 'Изменяет аудиторию, расписание и содержание шагов.'
          },
          {
            method: 'DELETE',
            path: '/api/automation/campaigns/{id}/',
            title: 'Удалить кампанию',
            description: 'Удаляет кампанию и её шаги.'
          }
        ]
      },
      {
        name: 'Шаги кампаний',
        description: 'Последовательные действия в рамках кампаний.',
        basePath: '/api/automation/campaign-steps/',
        feature: 'Требуется опция «Маркетинговые кампании».',
        operations: [
          {
            method: 'GET',
            path: '/api/automation/campaign-steps/',
            title: 'Список шагов',
            description: 'Возвращает шаги кампаний с типом действия и задержкой.'
          },
          {
            method: 'POST',
            path: '/api/automation/campaign-steps/',
            title: 'Создать шаг',
            description: 'Добавляет шаг кампании с шаблоном сообщения или webhook-действием.'
          },
          {
            method: 'GET',
            path: '/api/automation/campaign-steps/{id}/',
            title: 'Получить шаг',
            description: 'Возвращает конфигурацию шага и его статус.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/automation/campaign-steps/{id}/',
            title: 'Обновить шаг',
            description: 'Изменяет тип действия, задержку и контент.'
          },
          {
            method: 'DELETE',
            path: '/api/automation/campaign-steps/{id}/',
            title: 'Удалить шаг',
            description: 'Удаляет шаг из кампании.'
          }
        ]
      },
      {
        name: 'Уведомления',
        description: 'Правила уведомлений для сотрудников и клиентов.',
        basePath: '/api/automation/notifications/',
        feature: 'Требуется опция «Центр уведомлений».',
        operations: [
          {
            method: 'GET',
            path: '/api/automation/notifications/',
            title: 'Список уведомлений',
            description: 'Возвращает уведомления и их каналы доставки.'
          },
          {
            method: 'POST',
            path: '/api/automation/notifications/',
            title: 'Создать уведомление',
            description: 'Создаёт шаблон уведомления и условия срабатывания.'
          },
          {
            method: 'GET',
            path: '/api/automation/notifications/{id}/',
            title: 'Получить уведомление',
            description: 'Возвращает настройку уведомления и историю отправок.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/automation/notifications/{id}/',
            title: 'Обновить уведомление',
            description: 'Изменяет текст, канал и условия отправки.'
          },
          {
            method: 'DELETE',
            path: '/api/automation/notifications/{id}/',
            title: 'Удалить уведомление',
            description: 'Удаляет уведомление и отключает связанные триггеры.'
          }
        ]
      },
      {
        name: 'Webhook-события',
        description: 'Регистрируйте и отслеживайте входящие webhook-и.',
        basePath: '/api/automation/webhook-events/',
        feature: 'Требуется опция «Автоматизация webhook».',
        operations: [
          {
            method: 'GET',
            path: '/api/automation/webhook-events/',
            title: 'Список webhook-событий',
            description: 'Возвращает события и статусы доставки.'
          },
          {
            method: 'POST',
            path: '/api/automation/webhook-events/',
            title: 'Создать событие',
            description: 'Позволяет создавать тестовые события и регистрировать входящие запросы.'
          },
          {
            method: 'GET',
            path: '/api/automation/webhook-events/{id}/',
            title: 'Получить событие',
            description: 'Возвращает полезную нагрузку webhook-а.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/automation/webhook-events/{id}/',
            title: 'Обновить событие',
            description: 'Изменяет статус обработки и комментарии.'
          },
          {
            method: 'DELETE',
            path: '/api/automation/webhook-events/{id}/',
            title: 'Удалить событие',
            description: 'Удаляет событие и связанные журналы.'
          }
        ]
      }
    ]
  },
  {
    id: 'integrations',
    name: 'Integrations API',
    description: 'Управляйте API-ключами, вебхуками и внешними подключениями.',
    basePath: '/api/integrations/',
    resources: [
      {
        name: 'API-ключи',
        description: 'Создание и ротация ключей для внешних интеграций.',
        basePath: '/api/integrations/api-keys/',
        feature: 'Требуется опция «Внешние API-ключи».',
        operations: [
          {
            method: 'GET',
            path: '/api/integrations/api-keys/',
            title: 'Список API-ключей',
            description: 'Возвращает активные ключи и их метки.'
          },
          {
            method: 'POST',
            path: '/api/integrations/api-keys/',
            title: 'Создать API-ключ',
            description: 'Генерирует новый ключ с ограничениями по IP и ролям.'
          },
          {
            method: 'GET',
            path: '/api/integrations/api-keys/{id}/',
            title: 'Получить API-ключ',
            description: 'Возвращает параметры ключа и журнал использования.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/integrations/api-keys/{id}/',
            title: 'Обновить API-ключ',
            description: 'Изменяет ограничения и статус ключа.'
          },
          {
            method: 'DELETE',
            path: '/api/integrations/api-keys/{id}/',
            title: 'Удалить API-ключ',
            description: 'Отзывает ключ и прекращает доступ.'
          }
        ]
      },
      {
        name: 'Подписки на вебхуки',
        description: 'Настройка уведомлений о событиях SimplyCRM.',
        basePath: '/api/integrations/webhook-subscriptions/',
        feature: 'Требуется опция «Webhooks».',
        operations: [
          {
            method: 'GET',
            path: '/api/integrations/webhook-subscriptions/',
            title: 'Список подписок',
            description: 'Возвращает подписки с выбранными событиями и состоянием.'
          },
          {
            method: 'POST',
            path: '/api/integrations/webhook-subscriptions/',
            title: 'Создать подписку',
            description: 'Создаёт подписку с URL, секретом и выбранными событиями.'
          },
          {
            method: 'GET',
            path: '/api/integrations/webhook-subscriptions/{id}/',
            title: 'Получить подписку',
            description: 'Возвращает параметры подписки и последние попытки доставки.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/integrations/webhook-subscriptions/{id}/',
            title: 'Обновить подписку',
            description: 'Изменяет URL, секрет и набор событий.'
          },
          {
            method: 'DELETE',
            path: '/api/integrations/webhook-subscriptions/{id}/',
            title: 'Удалить подписку',
            description: 'Удаляет подписку и прекращает доставку событий.'
          }
        ]
      },
      {
        name: 'Интеграционные подключения',
        description: 'Подключайте внешние сервисы и храните токены.',
        basePath: '/api/integrations/integration-connections/',
        feature: 'Требуется опция «Коннекторы».',
        operations: [
          {
            method: 'GET',
            path: '/api/integrations/integration-connections/',
            title: 'Список подключений',
            description: 'Возвращает подключения с состоянием авторизации.'
          },
          {
            method: 'POST',
            path: '/api/integrations/integration-connections/',
            title: 'Создать подключение',
            description: 'Создаёт подключение к внешнему сервису с параметрами аутентификации.'
          },
          {
            method: 'GET',
            path: '/api/integrations/integration-connections/{id}/',
            title: 'Получить подключение',
            description: 'Возвращает параметры подключения и дату последней синхронизации.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/integrations/integration-connections/{id}/',
            title: 'Обновить подключение',
            description: 'Обновляет токены, конфигурацию и расписание синхронизаций.'
          },
          {
            method: 'DELETE',
            path: '/api/integrations/integration-connections/{id}/',
            title: 'Удалить подключение',
            description: 'Удаляет подключение и очищает привязанные данные.'
          }
        ]
      },
      {
        name: 'Журналы интеграций',
        description: 'Аудит взаимодействий с внешними сервисами.',
        basePath: '/api/integrations/integration-logs/',
        feature: 'Только чтение. Требуется опция «Коннекторы».',
        operations: [
          {
            method: 'GET',
            path: '/api/integrations/integration-logs/',
            title: 'Список журналов',
            description: 'Возвращает события интеграций, включая ошибки и длительность.'
          },
          {
            method: 'GET',
            path: '/api/integrations/integration-logs/{id}/',
            title: 'Получить запись журнала',
            description: 'Возвращает подробности конкретного события интеграции.'
          }
        ]
      },
      {
        name: 'Импорт данных',
        description: 'Массовый импорт через внешние источники.',
        basePath: '/api/integrations/import-jobs/',
        feature: 'Требуется опция «Импорт данных».',
        operations: [
          {
            method: 'GET',
            path: '/api/integrations/import-jobs/',
            title: 'Список импортов',
            description: 'Возвращает очереди задач импорта и их статусы.'
          },
          {
            method: 'POST',
            path: '/api/integrations/import-jobs/',
            title: 'Создать импорт',
            description: 'Создаёт задачу импорта с источником, типом сущностей и режимом слияния.'
          },
          {
            method: 'GET',
            path: '/api/integrations/import-jobs/{id}/',
            title: 'Получить импорт',
            description: 'Возвращает ход выполнения и журнал ошибок.'
          },
          {
            method: 'PATCH',
            displayMethod: 'PUT / PATCH',
            path: '/api/integrations/import-jobs/{id}/',
            title: 'Обновить импорт',
            description: 'Позволяет перезапустить или остановить выполнение задачи.'
          },
          {
            method: 'DELETE',
            path: '/api/integrations/import-jobs/{id}/',
            title: 'Удалить импорт',
            description: 'Удаляет задачу и связанные временные файлы.'
          }
        ]
      }
    ]
  }
];

const getMethodClass = (method: HttpMethod) => styles[methodClassName[method]] ?? styles.methodFallback;

export const ApiAccessPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'overview', 'api-access'],
    queryFn: billingApi.getOverview,
    staleTime: 5 * 60 * 1000
  });

  const methods = useMemo(() => data?.apiMethods ?? [], [data?.apiMethods]);

  return (
    <div className={styles.wrapper}>
      <Helmet>
        <title>API доступ — SimplyCRM</title>
      </Helmet>
      <header className={styles.header}>
        <div className={styles.introText}>
          <h1>API SimplyCRM</h1>
          <p>
            Подключайте ваш продукт ко всем модулям SimplyCRM через единый персональный ключ. Все эндпоинты ниже
            поддерживают аутентификацию по заголовку <code>Authorization: Token &lt;ключ&gt;</code> и возвращают данные в
            формате JSON.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!data}
          onClick={() => {
            if (data?.apiToken && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(data.apiToken);
              notificationBus.publish({
                type: 'info',
                title: 'Ключ скопирован',
                message: 'API ключ сохранён в буфер обмена.'
              });
            }
          }}
        >
          Скопировать API ключ
        </Button>
      </header>

      {isLoading && <p>Загружаем данные…</p>}
      {isError && <p>Не удалось получить информацию об API. Повторите попытку позже.</p>}

      {data ? (
        <>
          <section className={styles.tokenSection}>
            <h2>Ваш API ключ</h2>
            <p>
              Храните ключ в секрете и не публикуйте его в общедоступных репозиториях. Для серверного взаимодействия
              можно регенерировать ключ в любой момент.
            </p>
            <div className={styles.tokenBox}>
              <code>{data.apiToken}</code>
            </div>
          </section>

          <section className={styles.planSection}>
            <h2>Возможности текущего тарифа</h2>
            {methods.length === 0 ? (
              <p>Для текущего плана расширенные API методы недоступны. Перейдите на более высокий тариф для доступа.</p>
            ) : (
              <ul className={styles.planList}>
                {methods.map((method) => (
                  <li key={method.method}>
                    <strong>{method.method}</strong>
                    <span>{method.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.guideSection}>
            <h2>Быстрый старт</h2>
            <p>
              Базовый URL для всех запросов: <code>https://your-domain/api/</code>. Каждый путь оканчивается на
              слеш. Аутентификация выполняется через персональный ключ в заголовке Authorization. Пример запроса к
              заметкам сделок:
            </p>
            <pre>
{`curl -X GET \
  "https://your-domain/api/sales/notes/?page_size=50&ordering=-created_at" \
  -H "Authorization: Token ${data.apiToken}" \
  -H "Accept: application/json"`}
            </pre>
            <p>Для записи данных используйте JSON в теле запроса и указывайте заголовок <code>Content-Type: application/json</code>.</p>
          </section>

          <div className={styles.documentation}>
            {API_SECTIONS.map((section) => (
              <section key={section.id} className={styles.docSection} id={section.id}>
                <div className={styles.docHeader}>
                  <div>
                    <h2>{section.name}</h2>
                    <p>{section.description}</p>
                  </div>
                  <div className={styles.basePath}>
                    <span className={styles.basePathLabel}>Базовый путь</span>
                    <code>{`https://your-domain${section.basePath}`}</code>
                  </div>
                </div>

                <div className={styles.resourceGrid}>
                  {section.resources.map((resource) => (
                    <article key={resource.basePath} className={styles.resourceCard}>
                      <div className={styles.resourceHeader}>
                        <div>
                          <h3>{resource.name}</h3>
                          <code className={styles.resourcePath}>{resource.basePath}</code>
                        </div>
                        {resource.feature ? <span className={styles.featureBadge}>{resource.feature}</span> : null}
                      </div>
                      <p>{resource.description}</p>
                      <ul className={styles.operationList}>
                        {resource.operations.map((operation) => (
                          <li
                            key={`${operation.method}-${operation.path}-${operation.title}`}
                            className={styles.operationItem}
                          >
                            <span className={clsx(styles.methodBadge, getMethodClass(operation.method))}>
                              {operation.displayMethod ?? operation.method}
                            </span>
                            <div className={styles.operationBody}>
                              <code className={styles.operationPath}>{operation.path}</code>
                              <strong className={styles.operationTitle}>{operation.title}</strong>
                              <p>{operation.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

