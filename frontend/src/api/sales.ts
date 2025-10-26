import {apiClient} from './apiClient';
import {Deal, DealNote, PurchaseRecord} from '../types/sales';

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
    }
};
