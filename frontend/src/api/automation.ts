import { apiClient } from './apiClient';
import { AutomationRule, Campaign, NotificationRecord, WebhookEventRecord } from '../types/automation';

interface RawAutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  conditions?: Record<string, unknown>;
  actions?: unknown[];
  is_active: boolean;
  created_at: string;
}

interface RawCampaign {
  id: number;
  name: string;
  description?: string;
  status: string;
  audience_definition?: Record<string, unknown>;
  start_at: string | null;
  end_at: string | null;
  steps?: Array<{
    id: number;
    step_type: string;
    position: number;
    payload?: Record<string, unknown>;
    delay_minutes: number;
  }>;
}

interface RawNotification {
  id: number;
  channel: string;
  template: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  payload?: Record<string, unknown>;
}

interface RawWebhookEvent {
  id: number;
  url: string;
  event_type: string;
  status: string;
  last_response_code: number | null;
  created_at: string;
  delivered_at: string | null;
}

const normalizeRule = (raw: RawAutomationRule): AutomationRule => ({
  id: raw.id,
  name: raw.name,
  description: raw.description,
  trigger: raw.trigger,
  conditions: raw.conditions ?? {},
  actions: raw.actions ?? [],
  isActive: raw.is_active,
  createdAt: raw.created_at
});

const normalizeCampaign = (raw: RawCampaign): Campaign => ({
  id: raw.id,
  name: raw.name,
  description: raw.description,
  status: raw.status,
  audienceDefinition: raw.audience_definition ?? {},
  startAt: raw.start_at,
  endAt: raw.end_at,
  steps:
    raw.steps?.map((step) => ({
      id: step.id,
      stepType: step.step_type,
      position: step.position,
      payload: step.payload ?? {},
      delayMinutes: step.delay_minutes
    })) ?? []
});

const normalizeNotification = (raw: RawNotification): NotificationRecord => ({
  id: raw.id,
  channel: raw.channel,
  template: raw.template,
  status: raw.status,
  scheduledAt: raw.scheduled_at,
  sentAt: raw.sent_at,
  payload: raw.payload ?? {}
});

const normalizeWebhook = (raw: RawWebhookEvent): WebhookEventRecord => ({
  id: raw.id,
  url: raw.url,
  eventType: raw.event_type,
  status: raw.status,
  lastResponseCode: raw.last_response_code,
  createdAt: raw.created_at,
  deliveredAt: raw.delivered_at
});

export const automationApi = {
  async listRules(): Promise<AutomationRule[]> {
    const { data } = await apiClient.get<RawAutomationRule[]>('/api/automation-rules/');
    return data.map(normalizeRule);
  },

  async createRule(payload: {
    name: string;
    trigger: string;
    description?: string;
    conditions?: Record<string, unknown>;
    actions?: unknown[];
    isActive?: boolean;
  }): Promise<AutomationRule> {
    const { data } = await apiClient.post<RawAutomationRule>('/api/automation-rules/', {
      name: payload.name,
      trigger: payload.trigger,
      description: payload.description,
      conditions: payload.conditions ?? {},
      actions: payload.actions ?? [],
      is_active: payload.isActive ?? true
    });
    return normalizeRule(data);
  },

  async listCampaigns(): Promise<Campaign[]> {
    const { data } = await apiClient.get<RawCampaign[]>('/api/campaigns/');
    return data.map(normalizeCampaign);
  },

  async createCampaign(payload: {
    name: string;
    description?: string;
    status?: string;
    audienceDefinition?: Record<string, unknown>;
    startAt?: string | null;
    endAt?: string | null;
  }): Promise<Campaign> {
    const { data } = await apiClient.post<RawCampaign>('/api/campaigns/', {
      name: payload.name,
      description: payload.description,
      status: payload.status ?? 'draft',
      audience_definition: payload.audienceDefinition ?? {},
      start_at: payload.startAt ?? null,
      end_at: payload.endAt ?? null
    });
    return normalizeCampaign(data);
  },

  async listNotifications(): Promise<NotificationRecord[]> {
    const { data } = await apiClient.get<RawNotification[]>('/api/notifications/');
    return data.map(normalizeNotification);
  },

  async listWebhooks(): Promise<WebhookEventRecord[]> {
    const { data } = await apiClient.get<RawWebhookEvent[]>('/api/webhook-events/');
    return data.map(normalizeWebhook);
  },

  async createWebhook(payload: {
    url: string;
    eventType: string;
    payload?: Record<string, unknown>;
  }): Promise<WebhookEventRecord> {
    const { data } = await apiClient.post<RawWebhookEvent>('/api/webhook-events/', {
      url: payload.url,
      event_type: payload.eventType,
      payload: payload.payload ?? {},
      status: 'pending'
    });
    return normalizeWebhook(data);
  }
};
