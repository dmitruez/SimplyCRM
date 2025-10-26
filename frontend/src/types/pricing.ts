export interface FeatureToggle {
    code: string;
    label: string;
    description?: string;
    enabled?: boolean;
}

export interface PricingPlan {
    id: number;
    key: string;
    name: string;
    description?: string;
    pricePerMonth: number;
    currency: string;
    trialDays: number;
    featureFlags: FeatureToggle[];
}
