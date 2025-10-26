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
