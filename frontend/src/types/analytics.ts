export interface AnalyticsSummary {
    rfmSegments: number;
    demandAlerts: number;
    priceRecommendations: number;
    nextBestActions: number;
}

export interface PerformancePoint {
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
}

export interface ChannelBreakdown {
    channel: string;
    value: number;
}

export interface AnalyticsOverviewResponse {
    summary: AnalyticsSummary;
    performance: PerformancePoint[];
    channelBreakdown: ChannelBreakdown[];
}

export interface AnalyticsInsight {
    id: number;
    title: string;
    description?: string;
    severity: string;
    detectedAt: string;
    data: Record<string, unknown> | null;
}

export interface Forecast {
    id: number;
    name: string;
    target: string;
    horizonDays: number;
    configuration: Record<string, unknown>;
    result: Record<string, unknown> | null;
    generatedAt: string | null;
}

export interface CustomerSegment {
    id: number;
    name: string;
    description?: string;
    filterDefinition: Record<string, unknown>;
    size: number;
    ltv: number;
    churnRate: number;
    updatedAt: string;
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

export interface PriceRecommendationResult {
    generatedAt: string;
    recommendations: PriceRecommendation[];
}

export interface DemandEntry {
    variantId: number;
    variantName: string;
    velocity: number;
}

export interface DemandForecast {
    highDemand: DemandEntry[];
    lowVelocity: DemandEntry[];
}

export interface NextBestAction {
    opportunityId: number;
    summary: string;
    reason: string;
}

export interface RfmScore {
    customerId: number;
    recency: number | null;
    frequency: number;
    monetary: number;
}

export interface SalesMetricTotals {
    totalRevenue: number;
    averageOrderValue: number;
    ordersCount: number;
}

export interface AnalyticsAnomaly {
    type: string;
    message: string;
}
