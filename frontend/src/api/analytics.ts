import { apiClient } from './apiClient';
import { AnalyticsOverviewResponse } from '../types/analytics';

export const analyticsApi = {
  async getOverview(): Promise<AnalyticsOverviewResponse> {
    const { data } = await apiClient.get<AnalyticsOverviewResponse>('/analytics/overview/');
    return data;
  }
};
