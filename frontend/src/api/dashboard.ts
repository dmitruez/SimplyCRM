import { apiClient } from './apiClient';
import {
  ContactSummary,
  DashboardSalesMetrics,
  DealActivityEntry,
  DealStageSummary,
  DemandForecast,
  NextBestAction,
  NoteEntry,
  OpportunitySummary,
  OrderSummary,
  PipelineSummary,
  PriceRecommendation,
  UserSummary
} from '../types/dashboard';

const ensureList = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results as T[];
  }
  return [];
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const dashboardApi = {
  async getSalesMetrics(): Promise<DashboardSalesMetrics | null> {
    const { data } = await apiClient.get('/analytics/insight-analytics/sales-metrics/');
    if (!data) {
      return null;
    }
    return {
      totalRevenue: toNumber((data as any).total_revenue),
      averageOrderValue: toNumber((data as any).average_order_value),
      ordersCount: Number((data as any).orders_count ?? 0)
    };
  },

  async listPipelines(): Promise<PipelineSummary[]> {
    const { data } = await apiClient.get('/sales/pipelines/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? 'Без названия')
    }));
  },

  async listDealStages(): Promise<DealStageSummary[]> {
    const { data } = await apiClient.get('/sales/deal-stages/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      pipelineId: Number(item.pipeline),
      name: String(item.name ?? 'Этап'),
      position: Number(item.position ?? 0),
      winProbability: toNumber(item.win_probability)
    }));
  },

  async listOpportunities(): Promise<OpportunitySummary[]> {
    const { data } = await apiClient.get('/sales/opportunities/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? 'Сделка'),
      amount: toNumber(item.amount),
      probability: toNumber(item.probability),
      closeDate: item.close_date ?? null,
      stageId: Number(item.stage ?? 0),
      pipelineId: Number(item.pipeline ?? 0),
      ownerId: item.owner === null || item.owner === undefined ? null : Number(item.owner)
    }));
  },

  async listOrders(): Promise<OrderSummary[]> {
    const { data } = await apiClient.get('/sales/orders/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      status: String(item.status ?? 'draft'),
      currency: String(item.currency ?? 'USD'),
      totalAmount: toNumber(item.total_amount),
      orderedAt: item.ordered_at ?? '',
      fulfilledAt: item.fulfilled_at ?? null,
      contactId: item.contact === null || item.contact === undefined ? null : Number(item.contact),
      opportunityId:
        item.opportunity === null || item.opportunity === undefined ? null : Number(item.opportunity)
    }));
  },

  async listNotes(): Promise<NoteEntry[]> {
    const { data } = await apiClient.get('/sales/notes/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      content: String(item.content ?? ''),
      createdAt: item.created_at ?? '',
      authorId: item.author === null || item.author === undefined ? null : Number(item.author),
      relatedObjectType: String(item.related_object_type ?? ''),
      relatedObjectId: Number(item.related_object_id ?? 0)
    }));
  },

  async listDealActivities(): Promise<DealActivityEntry[]> {
    const { data } = await apiClient.get('/sales/deal-activities/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      subject: String(item.subject ?? ''),
      type: String(item.type ?? ''),
      dueAt: item.due_at ?? null,
      completedAt: item.completed_at ?? null,
      opportunityId: Number(item.opportunity ?? 0),
      ownerId: item.owner === null || item.owner === undefined ? null : Number(item.owner)
    }));
  },

  async listNextBestActions(): Promise<NextBestAction[]> {
    const { data } = await apiClient.get('/analytics/insight-analytics/next-best-actions/');
    return ensureList<any>(data).map((item) => ({
      opportunityId: Number(item.opportunity_id ?? 0),
      summary: String(item.summary ?? ''),
      reason: String(item.reason ?? '')
    }));
  },

  async getPriceRecommendations(): Promise<PriceRecommendation[]> {
    const { data } = await apiClient.get('/analytics/insight-analytics/price-recommendations/');
    const recommendations = (data as any)?.recommendations;
    return ensureList<any>(recommendations).map((item) => ({
      variantId: Number(item.variant_id ?? 0),
      variantName: String(item.variant_name ?? ''),
      unitsSold: Number(item.units_sold ?? 0),
      stockOnHand: Number(item.stock_on_hand ?? 0),
      coverageWeeks:
        item.coverage_weeks === null || item.coverage_weeks === undefined
          ? null
          : toNumber(item.coverage_weeks),
      margin: toNumber(item.margin),
      action: String(item.action ?? ''),
      reason: String(item.reason ?? ''),
      trendLabel: String(item.trend_label ?? '')
    }));
  },

  async getDemandForecast(): Promise<DemandForecast> {
    const { data } = await apiClient.get('/analytics/insight-analytics/demand-forecast/');
    const highDemand = ensureList<any>((data as any)?.high_demand).map((item) => ({
      variantId: Number(item.variant_id ?? 0),
      variantName: String(item.variant_name ?? ''),
      velocity: toNumber(item.velocity)
    }));
    const lowVelocity = ensureList<any>((data as any)?.low_velocity).map((item) => ({
      variantId: Number(item.variant_id ?? 0),
      variantName: String(item.variant_name ?? ''),
      velocity: toNumber(item.velocity)
    }));
    return { highDemand, lowVelocity };
  },

  async listUsers(): Promise<UserSummary[]> {
    const { data } = await apiClient.get('/users/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      firstName: String(item.first_name ?? ''),
      lastName: String(item.last_name ?? ''),
      username: String(item.username ?? '')
    }));
  },

  async listContacts(): Promise<ContactSummary[]> {
    const { data } = await apiClient.get('/sales/contacts/');
    return ensureList<any>(data).map((item) => ({
      id: Number(item.id),
      firstName: String(item.first_name ?? ''),
      lastName: String(item.last_name ?? ''),
      companyId: item.company === null || item.company === undefined ? null : Number(item.company)
    }));
  }
};
