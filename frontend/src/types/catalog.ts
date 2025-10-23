export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency: string;
  stock: number;
  supplierName?: string;
  updatedAt: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  supplierId?: number;
  minStock?: number;
  maxStock?: number;
  page?: number;
  pageSize?: number;
  ordering?: string;
}

export interface ProductListResponse {
  results: Product[];
  count: number;
}

export interface Supplier {
  id: number;
  name: string;
}
