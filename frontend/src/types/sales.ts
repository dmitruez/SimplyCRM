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

export interface InvoiceRecord {
    id: number;
    orderId: number;
    status: string;
    totalAmount: number;
    issuedAt: string;
    dueDate: string | null;
}

export interface PaymentRecord {
    id: number;
    invoiceId: number;
    amount: number;
    provider: string;
    processedAt: string | null;
    transactionReference?: string | null;
}

export interface ShipmentRecord {
    id: number;
    orderId: number;
    carrier: string;
    trackingNumber: string;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
}

export interface SalesContact {
    id: number;
    firstName: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
}

export interface OrderStatusUpdatePayload {
    status: string;
    fulfilledAt?: string | null;
}
