import { apiClient } from './apiClient';
import {
  AuditLogRecord,
  CoreUser,
  OrganizationInviteRecord,
  OrganizationSummary,
  UserRoleRecord
} from '../types/core';

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
  organization: OrganizationSummary | null;
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

interface RawInvite {
  id: number;
  organization: number;
  email: string | null;
  token: string;
  role: string | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  created_by_name: string | null;
  is_active: boolean;
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
  organization: user.organization ?? undefined
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

const normalizeInvite = (invite: RawInvite): OrganizationInviteRecord => ({
  id: invite.id,
  email: invite.email ?? undefined,
  token: invite.token,
  role: invite.role ?? undefined,
  createdAt: invite.created_at,
  expiresAt: invite.expires_at ?? undefined,
  acceptedAt: invite.accepted_at ?? undefined,
  createdByName: invite.created_by_name ?? undefined,
  isActive: invite.is_active
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
  },

  async listOrganizationInvites(): Promise<OrganizationInviteRecord[]> {
    const { data } = await apiClient.get<PaginatedResponse<RawInvite>>('/organization-invites/');
    return (data.results ?? []).map(normalizeInvite);
  },

  async createOrganizationInvite(payload: {
    email?: string;
    role?: string;
    expiresAt?: string;
  }): Promise<OrganizationInviteRecord> {
    const body: Record<string, unknown> = {};
    if (payload.email) {
      body.email = payload.email;
    }
    if (payload.role) {
      body.role = payload.role;
    }
    if (payload.expiresAt) {
      body.expires_at = payload.expiresAt;
    }
    const { data } = await apiClient.post<RawInvite>('/organization-invites/', body);
    return normalizeInvite(data);
  },

  async deleteOrganizationInvite(inviteId: number): Promise<void> {
    await apiClient.delete(`/organization-invites/${inviteId}/`);
  },

  async acceptInvite(token: string): Promise<OrganizationInviteRecord> {
    const { data } = await apiClient.post<RawInvite>('/invites/accept/', { token });
    return normalizeInvite(data);
  }
};
