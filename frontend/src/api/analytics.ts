import { apiClient } from './apiClient';
import {
  AnalyticsOverviewResponse,
  AnalyticsInsight,
  AnalyticsAnomaly,
  Forecast,
  CustomerSegment,
  PriceRecommendationResult,
  DemandForecast,
  NextBestAction,
  RfmScore,
  SalesMetricTotals
} from '../types/analytics';

type RawInsight = {
  id: number;
  title: string;
  description?: string;
  severity: string;
  detected_at: string;
  data?: Record<string, unknown> | null;
};

type RawForecast = {
  id: number;
  name: string;
  target: string;
  horizon_days: number;
  configuration?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  generated_at?: string | null;
};

type RawSegment = {
  id: number;
  name: string;
  description?: string;
  filter_definition?: Record<string, unknown> | null;
  size: number;
  ltv: number | string;
  churn_rate: number | string;
  updated_at: string;
};

type RawPriceRecommendationResult = {
  generated_at: string;
  recommendations: Array<{
    variant_id: number;
    variant_name: string;
    units_sold: number;
    stock_on_hand: number;
    coverage_weeks: number | null;
    margin: number | string;
    action: string;
    reason: string;
    trend_label: string;
  }>;
};

type RawDemandForecast = {
  high_demand: Array<{ variant_id: number; variant_name: string; velocity: number | string }>;
  low_velocity: Array<{ variant_id: number; variant_name: string; velocity: number | string }>;
};

type RawNextBestAction = {
  opportunity_id: number;
  summary: string;
  reason: string;
};

type RawRfmScore = {
  customer_id: number;
  recency: number | null;
  frequency: number;
  monetary: number | string;
};

type RawSalesMetrics = {
  total_revenue: number | string;
  average_order_value: number | string;
  orders_count: number;
};

type RawAnomaly = {
  type: string;
  message: string;
};

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInsight = (raw: RawInsight): AnalyticsInsight => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  severity: raw.severity,
  detectedAt: raw.detected_at,
  data: raw.data ?? null
});

const normalizeForecast = (raw: RawForecast): Forecast => ({
  id: raw.id,
  name: raw.name,
  target: raw.target,
  horizonDays: raw.horizon_days,
  configuration: raw.configuration ?? {},
  result: raw.result ?? null,
  generatedAt: raw.generated_at ?? null
});

const normalizeSegment = (raw: RawSegment): CustomerSegment => ({
  id: raw.id,
  name: raw.name,
  description: raw.description,
  filterDefinition: raw.filter_definition ?? {},
  size: raw.size,
  ltv: toNumber(raw.ltv),
  churnRate: toNumber(raw.churn_rate),
  updatedAt: raw.updated_at
});

const normalizePriceRecommendations = (raw: RawPriceRecommendationResult): PriceRecommendationResult => ({
  generatedAt: raw.generated_at,
  recommendations: raw.recommendations.map((item) => ({
    variantId: item.variant_id,
    variantName: item.variant_name,
    unitsSold: item.units_sold,
    stockOnHand: item.stock_on_hand,
    coverageWeeks: item.coverage_weeks,
    margin: toNumber(item.margin),
    action: item.action,
    reason: item.reason,
    trendLabel: item.trend_label
  }))
});

const normalizeDemandForecast = (raw: RawDemandForecast): DemandForecast => ({
  highDemand: raw.high_demand.map((entry) => ({
    variantId: entry.variant_id,
    variantName: entry.variant_name,
    velocity: toNumber(entry.velocity)
  })),
  lowVelocity: raw.low_velocity.map((entry) => ({
    variantId: entry.variant_id,
    variantName: entry.variant_name,
    velocity: toNumber(entry.velocity)
  }))
});

const normalizeNextBestActions = (rows: RawNextBestAction[]): NextBestAction[] =>
  rows.map((item) => ({
    opportunityId: item.opportunity_id,
    summary: item.summary,
    reason: item.reason
  }));

const normalizeRfmScores = (rows: RawRfmScore[]): RfmScore[] =>
  rows.map((row) => ({
    customerId: row.customer_id,
    recency: row.recency,
    frequency: row.frequency,
    monetary: toNumber(row.monetary)
  }));

const normalizeSalesMetrics = (raw: RawSalesMetrics): SalesMetricTotals => ({
  totalRevenue: toNumber(raw.total_revenue),
  averageOrderValue: toNumber(raw.average_order_value),
  ordersCount: raw.orders_count
});

const normalizeAnomalies = (rows: RawAnomaly[]): AnalyticsAnomaly[] =>
  rows.map((row) => ({ type: row.type, message: row.message }));

export const analyticsApi = {
  async getOverview(): Promise<AnalyticsOverviewResponse> {
    const { data } = await apiClient.get<AnalyticsOverviewResponse>('/analytics/overview/');
    return data;
  },

  async getInsights(): Promise<AnalyticsInsight[]> {
    const { data } = await apiClient.get<RawInsight[]>('/insights/');
    return data.map(normalizeInsight);
  },

  async getForecasts(): Promise<Forecast[]> {
    const { data } = await apiClient.get<RawForecast[]>('/forecasts/');
    return data.map(normalizeForecast);
  },

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const { data } = await apiClient.get<RawSegment[]>('/customer-segments/');
    return data.map(normalizeSegment);
  },

  async getPriceRecommendations(): Promise<PriceRecommendationResult> {
    const { data } = await apiClient.get<RawPriceRecommendationResult>(
      '/insight-analytics/price-recommendations/'
    );
    return normalizePriceRecommendations(data);
  },

  async getDemandForecast(): Promise<DemandForecast> {
    const { data } = await apiClient.get<RawDemandForecast>('/insight-analytics/demand-forecast/');
    return normalizeDemandForecast(data);
  },

  async getNextBestActions(): Promise<NextBestAction[]> {
    const { data } = await apiClient.get<RawNextBestAction[]>('/insight-analytics/next-best-actions/');
    return normalizeNextBestActions(data);
  },

  async getRfmScores(): Promise<RfmScore[]> {
    const { data } = await apiClient.get<RawRfmScore[]>('/insight-analytics/rfm/');
    return normalizeRfmScores(data);
  },

  async getSalesMetrics(): Promise<SalesMetricTotals> {
    const { data } = await apiClient.get<RawSalesMetrics>('/insight-analytics/sales-metrics/');
    return normalizeSalesMetrics(data);
  },

  async getAnomalies(): Promise<AnalyticsAnomaly[]> {
    const { data } = await apiClient.get<RawAnomaly[]>('/insight-analytics/anomalies/');
    return normalizeAnomalies(data);
  }
};
