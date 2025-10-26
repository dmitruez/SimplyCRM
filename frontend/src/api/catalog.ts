import { apiClient } from './apiClient';
import { Product, ProductFilters, ProductListResponse, Supplier, ProductVariant } from '../types/catalog';

type RawProductVariant = {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  cost: string | number;
  attributes: Record<string, unknown>;
};

type RawProduct = {
  id: number;
  organization: number;
  category: number | null;
  category_name?: string | null;
  name: string;
  sku: string;
  description?: string;
  main_image_url?: string | null;
  is_active: boolean;
  variants: RawProductVariant[];
};

type RawProductListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: RawProduct[];
};

const normalizeVariant = (variant: RawProductVariant): ProductVariant => ({
  id: variant.id,
  name: variant.name,
  sku: variant.sku,
  price: typeof variant.price === 'string' ? Number.parseFloat(variant.price) : variant.price,
  cost: typeof variant.cost === 'string' ? Number.parseFloat(variant.cost) : variant.cost,
  attributes: variant.attributes ?? {}
});

const normalizeProduct = (product: RawProduct): Product => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  description: product.description,
  category: product.category,
  categoryName: product.category_name ?? null,
  mainImageUrl: product.main_image_url ?? null,
  isActive: product.is_active,
  variants: (product.variants ?? []).map(normalizeVariant)
});

export const catalogApi = {
  async listProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const { pageSize, ...rest } = filters;
    const params = pageSize ? { ...rest, page_size: pageSize } : rest;
    const { data } = await apiClient.get<RawProductListResponse>('/catalog/products/', {
      params
    });
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map(normalizeProduct)
    };
  },

  async getProduct(productId: number | string): Promise<Product> {
    const { data } = await apiClient.get<RawProduct>(`/catalog/products/${productId}/`);
    return normalizeProduct(data);
  },

  async listSuppliers(): Promise<Supplier[]> {
    const { data } = await apiClient.get<Supplier[]>('/catalog/suppliers/');
    return data;
  },

  async createProduct(payload: {
    name: string;
    sku: string;
    description?: string;
    category?: number | null;
    image?: File | null;
  }): Promise<Product> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('sku', payload.sku);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.category) {
      formData.append('category', String(payload.category));
    }
    if (payload.image) {
      formData.append('main_image', payload.image);
    }

    const { data } = await apiClient.post<RawProduct>('/catalog/products/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return normalizeProduct(data);
  }
};
