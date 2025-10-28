export interface OrganizationSummary {
  id: number;
  name: string;
  slug: string;
}

export interface CoreUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  timezone?: string;
  locale?: string;
  isActive: boolean;
  isStaff: boolean;
  organization: OrganizationSummary;
}

export interface UserRoleRecord {
  id: number;
  userId: number;
  role: string;
  assignedAt: string;
}

export interface AuditLogRecord {
  id: number;
  organizationId: number;
  userId: number | null;
  action: string;
  entity: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
