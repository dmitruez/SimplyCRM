export interface DashboardSalesMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  ordersCount: number;
}

export interface PipelineSummary {
  id: number;
  name: string;
}

export interface DealStageSummary {
  id: number;
  pipelineId: number;
  name: string;
  position: number;
  winProbability: number;
}

export interface OpportunitySummary {
  id: number;
  name: string;
  amount: number;
  probability: number;
  closeDate: string | null;
  stageId: number;
  pipelineId: number;
  ownerId: number | null;
}

export interface OrderSummary {
  id: number;
  status: string;
  currency: string;
  totalAmount: number;
  orderedAt: string;
  fulfilledAt: string | null;
  contactId: number | null;
  opportunityId: number | null;
}

export interface NoteEntry {
  id: number;
  content: string;
  createdAt: string;
  authorId: number | null;
  relatedObjectType: string;
  relatedObjectId: number;
}

export interface DealActivityEntry {
  id: number;
  subject: string;
  type: string;
  dueAt: string | null;
  completedAt: string | null;
  opportunityId: number;
  ownerId: number | null;
}

export interface NextBestAction {
  opportunityId: number;
  summary: string;
  reason: string;
}

export interface PriceRecommendation {
  variantId: number;
  variantName: string;
  unitsSold: number;
  stockOnHand: number;
  coverageWeeks: number | null;
  margin: number;
  action: string;
  reason: string;
  trendLabel: string;
}

export interface DemandForecastEntry {
  variantId: number;
  variantName: string;
  velocity: number;
}

export interface DemandForecast {
  highDemand: DemandForecastEntry[];
  lowVelocity: DemandForecastEntry[];
}

export interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

export interface ContactSummary {
  id: number;
  firstName: string;
  lastName: string;
  companyId: number | null;
}
