export interface ApiKeyRecord {
  id: number;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface WebhookSubscriptionRecord {
  id: number;
  url: string;
  eventTypes: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export interface IntegrationConnectionRecord {
  id: number;
  provider: string;
  status: string;
  config: Record<string, unknown>;
  lastSyncedAt: string | null;
}

export interface IntegrationLogRecord {
  id: number;
  connection: number;
  level: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ImportJobRecord {
  id: number;
  dataSource: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  statistics: Record<string, unknown>;
}
