import { apiClient } from './apiClient';
import { Product, ProductFilters, ProductListResponse, Supplier } from '../types/catalog';

export const catalogApi = {
  async listProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const { pageSize, ...rest } = filters;
    const params = pageSize ? { ...rest, page_size: pageSize } : rest;
    const { data } = await apiClient.get<ProductListResponse>('/catalog/products/', {
      params
    });
    return data;
  },

  async getProduct(productId: number | string): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/catalog/products/${productId}/`);
    return data;
  },

  async listSuppliers(): Promise<Supplier[]> {
    const { data } = await apiClient.get<Supplier[]>('/catalog/suppliers/');
    return data;
  }
};
