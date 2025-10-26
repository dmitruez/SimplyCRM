import { apiClient } from './apiClient';
import { Deal, DealNote, PurchaseRecord, InvoiceRecord, PaymentRecord, ShipmentRecord } from '../types/sales';

interface PaginatedResponse<T> {
    results: T[];
}

interface OpportunityDto {
    id: number;
    name: string;
    pipeline_name: string;
    stage_name: string;
    owner_name: string | null;
    amount: number | string;
    close_date: string | null;
    probability: number | string;
}

interface NoteDto {
    id: number;
    author_name: string | null;
    content: string;
    created_at: string;
    related_object_type: string;
    related_object_id: number;
}

interface OrderDto {
    id: number;
    status: string;
    currency: string;
    total_amount: number | string;
    contact_name: string | null;
    ordered_at: string | null;
}

interface InvoiceDto {
    id: number;
    order: number;
    status: string;
    total_amount: number | string;
    issued_at: string;
    due_date: string | null;
}

interface PaymentDto {
    id: number;
    invoice: number;
    amount: number | string;
    provider: string;
    processed_at: string | null;
    transaction_reference: string | null;
}

interface ShipmentDto {
    id: number;
    order: number;
    carrier: string;
    tracking_number: string;
    shipped_at: string | null;
    delivered_at: string | null;
    status: string;
}

const toNumber = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
};

export const salesApi = {
    async listDeals(params?: Record<string, string | number | undefined>): Promise<Deal[]> {
        const {data} = await apiClient.get<PaginatedResponse<OpportunityDto>>('/sales/opportunities/', {
            params
        });
        return (data.results ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            pipelineName: item.pipeline_name,
            stageName: item.stage_name,
            ownerName: item.owner_name ?? undefined,
            amount: toNumber(item.amount),
            closeDate: item.close_date,
            probability: toNumber(item.probability)
        }));
    },

    async listPurchases(): Promise<PurchaseRecord[]> {
        const {data} = await apiClient.get<PaginatedResponse<OrderDto>>('/sales/orders/', {
            params: {page_size: 20, ordering: '-ordered_at'}
        });
        return (data.results ?? []).map((order) => ({
            id: order.id,
            status: order.status,
            totalAmount: toNumber(order.total_amount),
            currency: order.currency,
            contactName: order.contact_name ?? undefined,
            orderedAt: order.ordered_at
        }));
    },

    async listNotes(): Promise<DealNote[]> {
        const {data} = await apiClient.get<PaginatedResponse<NoteDto>>('/sales/notes/', {
            params: {page_size: 50, ordering: '-created_at'}
        });
        return (data.results ?? []).map((note) => ({
            id: note.id,
            authorName: note.author_name ?? undefined,
            content: note.content,
            createdAt: note.created_at,
            relatedObjectType: note.related_object_type,
            relatedObjectId: note.related_object_id
        }));
    },

    async createNote(payload: { content: string; relatedObjectType?: string; relatedObjectId?: number }): Promise<DealNote> {
        const body: Record<string, unknown> = { content: payload.content };
        if (payload.relatedObjectType) {
            body.related_object_type = payload.relatedObjectType;
        }
        if (typeof payload.relatedObjectId === 'number') {
            body.related_object_id = payload.relatedObjectId;
        }
        const { data } = await apiClient.post<NoteDto>('/sales/notes/', body);
        return {
            id: data.id,
            authorName: data.author_name ?? undefined,
            content: data.content,
            createdAt: data.created_at,
            relatedObjectType: data.related_object_type,
            relatedObjectId: data.related_object_id
        };
    },

    async listInvoices(): Promise<InvoiceRecord[]> {
        const { data } = await apiClient.get<PaginatedResponse<InvoiceDto>>('/sales/invoices/', {
            params: { page_size: 20, ordering: '-issued_at' }
        });
        return (data.results ?? []).map((invoice) => ({
            id: invoice.id,
            orderId: invoice.order,
            status: invoice.status,
            totalAmount: toNumber(invoice.total_amount),
            issuedAt: invoice.issued_at,
            dueDate: invoice.due_date
        }));
    },

    async listPayments(): Promise<PaymentRecord[]> {
        const { data } = await apiClient.get<PaginatedResponse<PaymentDto>>('/sales/payments/', {
            params: { page_size: 20, ordering: '-processed_at' }
        });
        return (data.results ?? []).map((payment) => ({
            id: payment.id,
            invoiceId: payment.invoice,
            amount: toNumber(payment.amount),
            provider: payment.provider,
            processedAt: payment.processed_at,
            transactionReference: payment.transaction_reference ?? undefined
        }));
    },

    async listShipments(): Promise<ShipmentRecord[]> {
        const { data } = await apiClient.get<PaginatedResponse<ShipmentDto>>('/sales/shipments/', {
            params: { page_size: 20, ordering: '-shipped_at' }
        });
        return (data.results ?? []).map((shipment) => ({
            id: shipment.id,
            orderId: shipment.order,
            carrier: shipment.carrier,
            trackingNumber: shipment.tracking_number,
            status: shipment.status,
            shippedAt: shipment.shipped_at,
            deliveredAt: shipment.delivered_at
        }));
    }
};
