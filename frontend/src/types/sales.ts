export interface Deal {
  id: number;
  name: string;
  pipelineName: string;
  stageName: string;
  ownerName?: string;
  amount: number;
  closeDate: string | null;
  probability: number;
}

export interface DealNote {
  id: number;
  authorName?: string;
  content: string;
  createdAt: string;
  relatedObjectType: string;
  relatedObjectId: number;
}

export interface PurchaseRecord {
  id: number;
  status: string;
  totalAmount: number;
  currency: string;
  contactName?: string;
  orderedAt: string | null;
}
