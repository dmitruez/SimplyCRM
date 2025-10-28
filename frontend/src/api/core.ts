import { apiClient } from './apiClient';
import { AuditLogRecord, CoreUser, OrganizationSummary, UserRoleRecord } from '../types/core';

interface PaginatedResponse<T> {
  results?: T[];
}

interface RawUser {
  id: number;
  username: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  timezone?: string | null;
  locale?: string | null;
  is_active: boolean;
  is_staff: boolean;
  organization: OrganizationSummary;
}

interface RawUserRole {
  id: number;
  user: number;
  role: string;
  assigned_at: string;
}

interface RawAuditLog {
  id: number;
  organization: number;
  user: number | null;
  action: string;
  entity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const normalizeUser = (user: RawUser): CoreUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstName: user.first_name ?? undefined,
  lastName: user.last_name ?? undefined,
  title: user.title ?? undefined,
  timezone: user.timezone ?? undefined,
  locale: user.locale ?? undefined,
  isActive: user.is_active,
  isStaff: user.is_staff,
  organization: user.organization
});

const normalizeRole = (role: RawUserRole): UserRoleRecord => ({
  id: role.id,
  userId: role.user,
  role: role.role,
  assignedAt: role.assigned_at
});

const normalizeAudit = (log: RawAuditLog): AuditLogRecord => ({
  id: log.id,
  organizationId: log.organization,
  userId: log.user,
  action: log.action,
  entity: log.entity,
  metadata: log.metadata ?? {},
  createdAt: log.created_at
});

export const coreApi = {
  async listUsers(): Promise<CoreUser[]> {
    const { data } = await apiClient.get<PaginatedResponse<RawUser>>('/users/');
    return (data.results ?? []).map(normalizeUser);
  },

  async listUserRoles(): Promise<UserRoleRecord[]> {
    const { data } = await apiClient.get<PaginatedResponse<RawUserRole>>('/user-roles/');
    return (data.results ?? []).map(normalizeRole);
  },

  async createUserRole(payload: { userId: number; role: string }): Promise<UserRoleRecord> {
    const { data } = await apiClient.post<RawUserRole>('/user-roles/', {
      user: payload.userId,
      role: payload.role
    });
    return normalizeRole(data);
  },

  async deleteUserRole(roleId: number): Promise<void> {
    await apiClient.delete(`/user-roles/${roleId}/`);
  },

  async listAuditLogs(limit = 25): Promise<AuditLogRecord[]> {
    const { data } = await apiClient.get<PaginatedResponse<RawAuditLog>>('/audit-logs/', {
      params: { page_size: limit }
    });
    return (data.results ?? []).map(normalizeAudit);
  }
};
