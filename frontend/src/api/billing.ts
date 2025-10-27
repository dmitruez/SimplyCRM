import { apiClient } from './apiClient';

export interface BillingPlan {
  id: number;
  key: string;
  name: string;
  description?: string;
  pricePerMonth: number;
  maxUsers: number;
  maxDeals: number;
  maxApiCallsPerMinute: number;
}

export interface SubscriptionSummary {
  id: number;
  startedAt: string;
  expiresAt?: string | null;
  isActive: boolean;
  plan: BillingPlan;
}

export interface ApiMethodDescription {
  method: string;
  description: string;
}

export interface BillingOverview {
  currentSubscription: SubscriptionSummary | null;
  availablePlans: BillingPlan[];
  apiToken: string;
  apiMethods: ApiMethodDescription[];
}

type RawBillingPlan = {
  id: number;
  key: string;
  name: string;
  description?: string;
  price_per_month: string | number;
  max_users: number;
  max_deals: number;
  max_api_calls_per_minute: number;
};

type RawSubscriptionSummary = {
  id: number;
  organization: number;
  plan: RawBillingPlan;
  started_at: string;
  expires_at?: string | null;
  is_active: boolean;
};

type RawBillingOverview = {
  current_subscription: RawSubscriptionSummary | null;
  available_plans: RawBillingPlan[];
  api_token: string;
  api_methods: ApiMethodDescription[];
};

const normalizePlan = (plan: RawBillingPlan): BillingPlan => ({
  id: plan.id,
  key: plan.key,
  name: plan.name,
  description: plan.description,
  pricePerMonth: typeof plan.price_per_month === 'string' ? Number.parseFloat(plan.price_per_month) : plan.price_per_month,
  maxUsers: plan.max_users,
  maxDeals: plan.max_deals,
  maxApiCallsPerMinute: plan.max_api_calls_per_minute
});

const normalizeSubscription = (subscription: RawSubscriptionSummary): SubscriptionSummary => ({
  id: subscription.id,
  startedAt: subscription.started_at,
  expiresAt: subscription.expires_at,
  isActive: subscription.is_active,
  plan: normalizePlan(subscription.plan)
});

export const billingApi = {
  async getOverview(): Promise<BillingOverview> {
    const { data } = await apiClient.get<RawBillingOverview>('/billing/overview/');
    console.log(data)
    return {
      currentSubscription: data.current_subscription ? normalizeSubscription(data.current_subscription) : null,
      availablePlans: data.available_plans.map(normalizePlan),
      apiToken: data.api_token,
      apiMethods: data.api_methods
    };
  },
  async changePlan(payload: { planKey?: string; planId?: number }): Promise<SubscriptionSummary> {
    const { data } = await apiClient.post<RawSubscriptionSummary>('/billing/change-plan/', {
      plan_key: payload.planKey,
      plan_id: payload.planId
    });
    return normalizeSubscription(data);
  }
};
