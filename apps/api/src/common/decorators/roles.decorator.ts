import { SetMetadata } from '@nestjs/common';
import { OrganizationMemberRole, UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export type RoleRequirement = UserRole | OrganizationMemberRole;
export const Roles = (...roles: RoleRequirement[]) => SetMetadata(ROLES_KEY, roles);
