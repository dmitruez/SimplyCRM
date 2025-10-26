import {apiClient} from './apiClient';
import {
    ActivityDigest,
    DashboardOverview,
    DashboardSummary,
    InvoiceDigest,
    NoteDigest,
    OpportunityDigest,
    OrderDigest,
    PaymentDigest,
    PipelineSnapshot,
    ShipmentDigest
} from '../types/dashboard';

interface RawSummary {
    open_opportunities: number;
    pipeline_total: number | string;
    pending_orders: number;
    orders_total: number | string;
    invoices_due: number;
    overdue_invoices: number;
    payments_month: number | string;
    shipments_in_transit: number;
    products_active: number;
    product_variants: number;
    suppliers: number;
    inventory_on_hand: number;
    notes_recent: number;
    currency: string;
}

interface RawPipeline {
    pipeline: string;
    stage: string;
    count: number;
    value: number | string;
}

interface RawOpportunity {
    id: number;
    name: string;
    pipeline: string;
    stage: string;
    owner: string | null;
    amount: number | string;
    close_date: string | null;
    probability: number | string;
}

interface RawOrder {
    id: number;
    status: string;
    currency: string;
    total: number | string;
    contact: string | null;
    ordered_at: string | null;
}

interface RawInvoice {
    id: number;
    status: string;
    total: number | string;
    due_date: string | null;
    issued_at: string;
    order_id: number;
}

interface RawPayment {
    id: number;
    amount: number | string;
    provider: string;
    processed_at: string | null;
    invoice_id: number;
}

interface RawShipment {
    id: number;
    status: string;
    carrier: string;
    tracking_number: string;
    shipped_at: string | null;
    delivered_at: string | null;
    order_id: number;
}

interface RawNote {
    id: number;
    content: string;
    author: string | null;
    created_at: string;
    related_object: {
        type: string;
        id: number;
    };
}

interface RawActivity {
    id: number;
    type: string;
    subject: string;
    due_at: string | null;
    completed_at: string | null;
    owner: string | null;
    opportunity: {
        id: number;
        name: string | null;
    };
}

interface RawDashboardOverview {
    summary: RawSummary;
    pipeline: RawPipeline[];
    recent_opportunities: RawOpportunity[];
    recent_orders: RawOrder[];
    recent_invoices: RawInvoice[];
    recent_payments: RawPayment[];
    recent_shipments: RawShipment[];
    recent_notes: RawNote[];
    upcoming_activities: RawActivity[];
}

const toNumber = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeSummary = (raw: RawSummary): DashboardSummary => ({
    openOpportunities: raw.open_opportunities,
    pipelineTotal: toNumber(raw.pipeline_total),
    pendingOrders: raw.pending_orders,
    ordersTotal: toNumber(raw.orders_total),
    invoicesDue: raw.invoices_due,
    overdueInvoices: raw.overdue_invoices,
    paymentsMonth: toNumber(raw.payments_month),
    shipmentsInTransit: raw.shipments_in_transit,
    productsActive: raw.products_active,
    productVariants: raw.product_variants,
    suppliers: raw.suppliers,
    inventoryOnHand: raw.inventory_on_hand,
    notesRecent: raw.notes_recent,
    currency: raw.currency || 'USD'
});

const normalizePipeline = (rows: RawPipeline[]): PipelineSnapshot[] =>
    rows.map((row) => ({
        pipeline: row.pipeline,
        stage: row.stage,
        count: row.count,
        value: toNumber(row.value)
    }));

const normalizeOpportunities = (items: RawOpportunity[]): OpportunityDigest[] =>
    items.map((item) => ({
        id: item.id,
        name: item.name,
        pipeline: item.pipeline,
        stage: item.stage,
        owner: item.owner ?? undefined,
        amount: toNumber(item.amount),
        closeDate: item.close_date,
        probability: toNumber(item.probability)
    }));

const normalizeOrders = (items: RawOrder[]): OrderDigest[] =>
    items.map((item) => ({
        id: item.id,
        status: item.status,
        currency: item.currency,
        total: toNumber(item.total),
        contact: item.contact ?? undefined,
        orderedAt: item.ordered_at
    }));

const normalizeInvoices = (items: RawInvoice[]): InvoiceDigest[] =>
    items.map((item) => ({
        id: item.id,
        status: item.status,
        total: toNumber(item.total),
        dueDate: item.due_date,
        issuedAt: item.issued_at,
        orderId: item.order_id
    }));

const normalizePayments = (items: RawPayment[]): PaymentDigest[] =>
    items.map((item) => ({
        id: item.id,
        amount: toNumber(item.amount),
        provider: item.provider,
        processedAt: item.processed_at,
        invoiceId: item.invoice_id
    }));

const normalizeShipments = (items: RawShipment[]): ShipmentDigest[] =>
    items.map((item) => ({
        id: item.id,
        status: item.status,
        carrier: item.carrier,
        trackingNumber: item.tracking_number,
        shippedAt: item.shipped_at,
        deliveredAt: item.delivered_at,
        orderId: item.order_id
    }));

const normalizeNotes = (items: RawNote[]): NoteDigest[] =>
    items.map((item) => ({
        id: item.id,
        content: item.content,
        author: item.author ?? undefined,
        createdAt: item.created_at,
        relatedObject: item.related_object
    }));

const normalizeActivities = (items: RawActivity[]): ActivityDigest[] =>
    items.map((item) => ({
        id: item.id,
        type: item.type,
        subject: item.subject,
        dueAt: item.due_at,
        completedAt: item.completed_at ?? undefined,
        owner: item.owner ?? undefined,
        opportunity: item.opportunity.name
            ? {id: item.opportunity.id, name: item.opportunity.name}
            : undefined
    }));

export const dashboardApi = {
    async getOverview(): Promise<DashboardOverview> {
        const {data} = await apiClient.get<RawDashboardOverview>('/dashboard/overview/');
        return {
            summary: normalizeSummary(data.summary),
            pipeline: normalizePipeline(data.pipeline),
            recentOpportunities: normalizeOpportunities(data.recent_opportunities),
            recentOrders: normalizeOrders(data.recent_orders),
            recentInvoices: normalizeInvoices(data.recent_invoices),
            recentPayments: normalizePayments(data.recent_payments),
            recentShipments: normalizeShipments(data.recent_shipments),
            recentNotes: normalizeNotes(data.recent_notes),
            upcomingActivities: normalizeActivities(data.upcoming_activities)
        };
    }
};
