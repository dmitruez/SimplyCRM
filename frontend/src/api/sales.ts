import { apiClient } from './apiClient';
import {
  Deal,
  DealListResponse,
  DealNote,
  NotesResponse,
  PurchaseListResponse,
  PurchaseRecord
} from '../types/sales';

export const salesApi = {
  async listDeals(params?: { stage?: string; owner?: string; productId?: number }): Promise<Deal[]> {
    const { productId, ...rest } = params ?? {};
    const queryParams = productId ? { ...rest, product: productId } : rest;
    const { data } = await apiClient.get<DealListResponse>('/sales/deals/', { params: queryParams });
    return data.results;
  },

  async listPurchases(): Promise<PurchaseRecord[]> {
    const { data } = await apiClient.get<PurchaseListResponse>('/sales/purchases/');
    return data.results;
  },

  async listNotes(): Promise<DealNote[]> {
    const { data } = await apiClient.get<NotesResponse>('/sales/notes/');
    return data.results;
  }
};
