import { apiClient } from './apiClient';
import {
    Deal,
    DealNote,
    PurchaseRecord,
    InvoiceRecord,
    PaymentRecord,
    ShipmentRecord,
    SalesContact,
    OrderStatusUpdatePayload
} from '../types/sales';

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

interface ContactDto {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone_number: string | null;
}

interface OrderLineDto {
    id: number;
    order: number;
    product_variant: number;
    quantity: number;
    unit_price: number | string;
    discount_amount: number | string;
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

    async listPurchases(params: Record<string, string | number | undefined> = {}): Promise<PurchaseRecord[]> {
        const {data} = await apiClient.get<PaginatedResponse<OrderDto>>('/sales/orders/', {
            params: {page_size: 20, ordering: '-ordered_at', ...params}
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

    async listContacts(): Promise<SalesContact[]> {
        const { data } = await apiClient.get<PaginatedResponse<ContactDto>>('/sales/contacts/', {
            params: { page_size: 100, ordering: 'first_name' }
        });
        return (data.results ?? []).map((contact) => ({
            id: contact.id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email ?? undefined,
            phoneNumber: contact.phone_number ?? undefined
        }));
    },

    async createContact(payload: { firstName: string; lastName?: string; email?: string; phoneNumber?: string }): Promise<SalesContact> {
        const body: Record<string, unknown> = {
            first_name: payload.firstName
        };
        if (payload.lastName) {
            body.last_name = payload.lastName;
        }
        if (payload.email) {
            body.email = payload.email;
        }
        if (payload.phoneNumber) {
            body.phone_number = payload.phoneNumber;
        }
        const { data } = await apiClient.post<ContactDto>('/sales/contacts/', body);
        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email ?? undefined,
            phoneNumber: data.phone_number ?? undefined
        };
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
    },

    async createOrder(payload: { contactId?: number | null; opportunityId?: number | null; status?: string; currency?: string }): Promise<PurchaseRecord> {
        const body: Record<string, unknown> = {};
        if (typeof payload.contactId === 'number') {
            body.contact = payload.contactId;
        }
        if (typeof payload.opportunityId === 'number') {
            body.opportunity = payload.opportunityId;
        }
        if (payload.status) {
            body.status = payload.status;
        }
        if (payload.currency) {
            body.currency = payload.currency;
        }
        const { data } = await apiClient.post<OrderDto>('/sales/orders/', body);
        return {
            id: data.id,
            status: data.status,
            totalAmount: toNumber(data.total_amount),
            currency: data.currency,
            contactName: data.contact_name ?? undefined,
            orderedAt: data.ordered_at
        };
    },

    async updateOrder(orderId: number, payload: OrderStatusUpdatePayload): Promise<PurchaseRecord> {
        const { data } = await apiClient.patch<OrderDto>(`/sales/orders/${orderId}/`, {
            status: payload.status,
            fulfilled_at: payload.fulfilledAt ?? undefined
        });
        return {
            id: data.id,
            status: data.status,
            totalAmount: toNumber(data.total_amount),
            currency: data.currency,
            contactName: data.contact_name ?? undefined,
            orderedAt: data.ordered_at
        };
    },

    async createOrderLine(payload: { orderId: number; variantId: number; quantity: number; unitPrice: number; discountAmount?: number }): Promise<OrderLineDto> {
        const body: Record<string, unknown> = {
            order: payload.orderId,
            product_variant: payload.variantId,
            quantity: payload.quantity,
            unit_price: payload.unitPrice
        };
        if (typeof payload.discountAmount === 'number') {
            body.discount_amount = payload.discountAmount;
        }
        const { data } = await apiClient.post<OrderLineDto>('/sales/order-lines/', body);
        return data;
    },

    async createInvoice(payload: { orderId: number; totalAmount: number; dueDate?: string | null; status?: string }): Promise<InvoiceRecord> {
        const body: Record<string, unknown> = {
            order: payload.orderId,
            total_amount: payload.totalAmount
        };
        if (payload.dueDate) {
            body.due_date = payload.dueDate;
        }
        if (payload.status) {
            body.status = payload.status;
        }
        const { data } = await apiClient.post<InvoiceDto>('/sales/invoices/', body);
        return {
            id: data.id,
            orderId: data.order,
            status: data.status,
            totalAmount: toNumber(data.total_amount),
            issuedAt: data.issued_at,
            dueDate: data.due_date
        };
    },

    async createPayment(payload: { invoiceId: number; amount: number; provider: string; transactionReference?: string | null }): Promise<PaymentRecord> {
        const body: Record<string, unknown> = {
            invoice: payload.invoiceId,
            amount: payload.amount,
            provider: payload.provider
        };
        if (payload.transactionReference) {
            body.transaction_reference = payload.transactionReference;
        }
        const { data } = await apiClient.post<PaymentDto>('/sales/payments/', body);
        return {
            id: data.id,
            invoiceId: data.invoice,
            amount: toNumber(data.amount),
            provider: data.provider,
            processedAt: data.processed_at,
            transactionReference: data.transaction_reference ?? undefined
        };
    }
};
