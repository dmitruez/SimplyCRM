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
  arr: number;
  healthScore: number;
  usageTrend: number;
  lastActive: string;
  avatarColor: string;
  tags: string[];
  accountOwner: string;
  segment: string;
  lifecycleStage: 'onboarding' | 'active' | 'expansion' | 'risk';
  renewalDate: string;
  lastInteraction: string;
  timezone: string;
  region: string;
  healthStatus: 'healthy' | 'attention' | 'risk';
  healthReason?: string;
  openTickets: number;
  csatScore: number;
  adoptionScore: number;
  topProducts: string[];
}

export interface AdminTeamMember {
  id: number;
  name: string;
  role: string;
  avatarColor: string;
  focus: string;
  status: 'available' | 'busy' | 'offline';
  email: string;
}

export interface AdminTask {
  id: number;
  title: string;
  companyId: number;
  company: string;
  dueDate: string;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId: number;
  assigneeName: string;
  relatedPlan?: string;
}

export interface AdminSignal {
  id: number;
  companyId: number;
  company: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  metric: string;
  recommendation: string;
  occurredAt: string;
}

export interface AdminPipelineDeal {
  id: number;
  companyId: number;
  company: string;
  plan: string;
  amount: number;
  stageId: AdminPipelineStageId;
  probability: number;
  owner: string;
  updatedAt: string;
  nextStep: string;
  health: 'positive' | 'neutral' | 'risk';
}

export type AdminPipelineStageId =
  | 'qualification'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'closed';

export interface AdminPipelineStage {
  id: AdminPipelineStageId;
  name: string;
  description: string;
  probability: number;
  order: number;
}

export interface AdminPipelineLane extends AdminPipelineStage {
  deals: AdminPipelineDeal[];
  totalAmount: number;
  avgAgeDays: number;
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
