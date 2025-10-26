import { apiClient } from './apiClient';
import {
  ApiKeyRecord,
  WebhookSubscriptionRecord,
  IntegrationConnectionRecord,
  IntegrationLogRecord,
  ImportJobRecord
} from '../types/integrations';

interface RawApiKey {
  id: number;
  name: string;
  key: string;
  permissions?: string[];
  created_at: string;
  last_used_at: string | null;
}

interface RawWebhookSubscription {
  id: number;
  url: string;
  event_types?: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
}

interface RawIntegrationConnection {
  id: number;
  provider: string;
  status: string;
  config?: Record<string, unknown>;
  last_synced_at: string | null;
}

interface RawIntegrationLog {
  id: number;
  connection: number;
  level: string;
  message: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

interface RawImportJob {
  id: number;
  data_source: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  statistics?: Record<string, unknown>;
}

const normalizeApiKey = (raw: RawApiKey): ApiKeyRecord => ({
  id: raw.id,
  name: raw.name,
  key: raw.key,
  permissions: raw.permissions ?? [],
  createdAt: raw.created_at,
  lastUsedAt: raw.last_used_at
});

const normalizeWebhook = (raw: RawWebhookSubscription): WebhookSubscriptionRecord => ({
  id: raw.id,
  url: raw.url,
  eventTypes: raw.event_types ?? [],
  secret: raw.secret,
  isActive: raw.is_active,
  createdAt: raw.created_at
});

const normalizeConnection = (raw: RawIntegrationConnection): IntegrationConnectionRecord => ({
  id: raw.id,
  provider: raw.provider,
  status: raw.status,
  config: raw.config ?? {},
  lastSyncedAt: raw.last_synced_at
});

const normalizeLog = (raw: RawIntegrationLog): IntegrationLogRecord => ({
  id: raw.id,
  connection: raw.connection,
  level: raw.level,
  message: raw.message,
  payload: raw.payload ?? {},
  createdAt: raw.created_at
});

const normalizeImportJob = (raw: RawImportJob): ImportJobRecord => ({
  id: raw.id,
  dataSource: raw.data_source,
  status: raw.status,
  startedAt: raw.started_at,
  completedAt: raw.completed_at,
  statistics: raw.statistics ?? {}
});

export const integrationsApi = {
  async listApiKeys(): Promise<ApiKeyRecord[]> {
    const { data } = await apiClient.get<RawApiKey[]>('/integrations/api-keys/');
    return data.map(normalizeApiKey);
  },

  async createApiKey(payload: { name: string; key: string; permissions?: string[] }): Promise<ApiKeyRecord> {
    const { data } = await apiClient.post<RawApiKey>('/integrations/api-keys/', {
      name: payload.name,
      key: payload.key,
      permissions: payload.permissions ?? []
    });
    return normalizeApiKey(data);
  },

  async listWebhooks(): Promise<WebhookSubscriptionRecord[]> {
    const { data } = await apiClient.get<RawWebhookSubscription[]>('/integrations/webhook-subscriptions/');
    return data.map(normalizeWebhook);
  },

  async createWebhook(payload: { url: string; eventTypes: string[]; secret?: string }): Promise<WebhookSubscriptionRecord> {
    const { data } = await apiClient.post<RawWebhookSubscription>('/integrations/webhook-subscriptions/', {
      url: payload.url,
      event_types: payload.eventTypes,
      secret: payload.secret ?? '',
      is_active: true
    });
    return normalizeWebhook(data);
  },

  async listConnections(): Promise<IntegrationConnectionRecord[]> {
    const { data } = await apiClient.get<RawIntegrationConnection[]>('/integrations/integration-connections/');
    return data.map(normalizeConnection);
  },

  async createConnection(payload: { provider: string; config?: Record<string, unknown>; status?: string }): Promise<IntegrationConnectionRecord> {
    const { data } = await apiClient.post<RawIntegrationConnection>('/integrations/integration-connections/', {
      provider: payload.provider,
      config: payload.config ?? {},
      status: payload.status ?? 'connected'
    });
    return normalizeConnection(data);
  },

  async listLogs(): Promise<IntegrationLogRecord[]> {
    const { data } = await apiClient.get<RawIntegrationLog[]>('/integrations/integration-logs/');
    return data.map(normalizeLog);
  },

  async listImportJobs(): Promise<ImportJobRecord[]> {
    const { data } = await apiClient.get<RawImportJob[]>('/integrations/import-jobs/');
    return data.map(normalizeImportJob);
  },

  async createImportJob(payload: { dataSource: string; status?: string; statistics?: Record<string, unknown> }): Promise<ImportJobRecord> {
    const { data } = await apiClient.post<RawImportJob>('/integrations/import-jobs/', {
      data_source: payload.dataSource,
      status: payload.status ?? 'pending',
      statistics: payload.statistics ?? {}
    });
    return normalizeImportJob(data);
  }
};
