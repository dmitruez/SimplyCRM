export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: unknown[];
  isActive: boolean;
  createdAt: string;
}

export interface CampaignStep {
  id: number;
  stepType: string;
  position: number;
  payload: Record<string, unknown>;
  delayMinutes: number;
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: string;
  audienceDefinition: Record<string, unknown>;
  startAt: string | null;
  endAt: string | null;
  steps: CampaignStep[];
}

export interface NotificationRecord {
  id: number;
  channel: string;
  template: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  payload: Record<string, unknown>;
}

export interface WebhookEventRecord {
  id: number;
  url: string;
  eventType: string;
  status: string;
  lastResponseCode: number | null;
  createdAt: string;
  deliveredAt: string | null;
}
