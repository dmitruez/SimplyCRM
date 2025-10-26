export interface AdminMetric {
  id: string;
  label: string;
  value: string;
  delta: number;
  deltaLabel?: string;
  trend?: 'up' | 'down' | 'steady';
}

export interface AdminPlanDistribution {
  planKey: string;
  planName: string;
  percentage: number;
  seatsUsed: number;
  seatsTotal: number;
  color: string;
}

export interface AdminRevenuePoint {
  label: string;
  value: number;
}

export interface AdminOverview {
  metrics: AdminMetric[];
  planDistribution: AdminPlanDistribution[];
  revenueTrend: AdminRevenuePoint[];
  satisfactionScore: number;
  retentionRate: number;
  nps: number;
}

export interface AdminUserRecord {
  id: number;
  fullName: string;
  email: string;
  organization: string;
  planKey: string;
  planName: string;
  status: 'active' | 'invited' | 'trialing' | 'suspended';
  seatsUsed: number;
  seatsTotal: number;
  monthlySpend: number;
  healthScore: number;
  usageTrend: number;
  lastActive: string;
  avatarColor: string;
  tags: string[];
}

export interface AdminPlanOption {
  key: string;
  name: string;
  pricePerSeat: number;
  description: string;
  recommended?: boolean;
  badge?: string;
  highlightColor: string;
  features: string[];
}

export interface AdminPlanRequest {
  id: number;
  organization: string;
  contactName: string;
  contactEmail: string;
  currentPlan: string;
  requestedPlan: string;
  message?: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'contacted' | 'approved' | 'rejected';
}

export interface AdminActivityRecord {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  tone: 'info' | 'success' | 'warning';
  icon: string;
  description?: string;
}
