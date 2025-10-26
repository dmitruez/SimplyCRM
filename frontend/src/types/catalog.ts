export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  attributes: Record<string, unknown>;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category?: number | null;
  categoryName?: string | null;
  mainImageUrl?: string | null;
  isActive: boolean;
  variants: ProductVariant[];
}

export interface ProductFilters {
  search?: string;
  category?: number;
  page?: number;
  pageSize?: number;
  ordering?: string;
}

export interface ProductListResponse {
  results: Product[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

export interface Supplier {
    id: number;
    name: string;
}
