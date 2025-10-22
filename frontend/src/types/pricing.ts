export interface FeatureToggle {
  code: string;
  label: string;
  description?: string;
  enabled?: boolean;
}

export interface PricingPlan {
  id: number;
  name: string;
  billingPeriod: 'monthly' | 'yearly';
  price: number;
  currency: string;
  trialDays: number;
  featureFlags: FeatureToggle[];
}
