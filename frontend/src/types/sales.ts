export interface Deal {
  id: number;
  title: string;
  stage: string;
  owner: string;
  value: number;
  currency: string;
  expectedCloseDate: string;
  probability: number;
}

export interface DealNote {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  relatedDealId?: number;
}

export interface PurchaseRecord {
  id: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  status: string;
  placedAt: string;
}

export interface DealListResponse {
  results: Deal[];
}

export interface PurchaseListResponse {
  results: PurchaseRecord[];
}

export interface NotesResponse {
  results: DealNote[];
}
