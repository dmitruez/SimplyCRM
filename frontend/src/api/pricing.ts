import { apiClient } from './apiClient';
import { PricingPlan } from '../types/pricing';

export const pricingApi = {
  async listPlans(): Promise<PricingPlan[]> {
    const { data } = await apiClient.get<PricingPlan[]>('/subscriptions/plans/');
    return data;
  }
};
