export interface DashboardSummary {
  openOpportunities: number;
  pipelineTotal: number;
  pendingOrders: number;
  ordersTotal: number;
  invoicesDue: number;
  overdueInvoices: number;
  paymentsMonth: number;
  shipmentsInTransit: number;
  productsActive: number;
  productVariants: number;
  suppliers: number;
  inventoryOnHand: number;
  notesRecent: number;
  currency: string;
}

export interface PipelineSnapshot {
  pipeline: string;
  stage: string;
  count: number;
  value: number;
}

export interface OpportunityDigest {
  id: number;
  name: string;
  pipeline: string;
  stage: string;
  owner?: string;
  amount: number;
  closeDate: string | null;
  probability: number;
}

export interface OrderDigest {
  id: number;
  status: string;
  currency: string;
  total: number;
  contact?: string;
  orderedAt: string | null;
}

export interface InvoiceDigest {
  id: number;
  status: string;
  total: number;
  dueDate: string | null;
  issuedAt: string;
  orderId: number;
}

export interface PaymentDigest {
  id: number;
  amount: number;
  provider: string;
  processedAt: string | null;
  invoiceId: number;
}

export interface ShipmentDigest {
  id: number;
  status: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  orderId: number;
}

export interface NoteDigest {
  id: number;
  content: string;
  author?: string;
  createdAt: string;
  relatedObject: {
    type: string;
    id: number;
  };
}

export interface ActivityDigest {
  id: number;
  type: string;
  subject: string;
  dueAt: string | null;
  completedAt?: string;
  owner?: string;
  opportunity?: {
    id: number;
    name: string;
  };
}

export interface DashboardOverview {
  summary: DashboardSummary;
  pipeline: PipelineSnapshot[];
  recentOpportunities: OpportunityDigest[];
  recentOrders: OrderDigest[];
  recentInvoices: InvoiceDigest[];
  recentPayments: PaymentDigest[];
  recentShipments: ShipmentDigest[];
  recentNotes: NoteDigest[];
  upcomingActivities: ActivityDigest[];
}
