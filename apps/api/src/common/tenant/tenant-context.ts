import { OrganizationMemberRole, UserRole } from '@prisma/client';

export interface AuthenticatedMembership {
  organizationId: string;
  role: OrganizationMemberRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  organizationId?: string | null;
  memberships: AuthenticatedMembership[];
}

export interface TenantContext {
  organizationId: string;
  userId: string;
  membershipRole: OrganizationMemberRole;
}

