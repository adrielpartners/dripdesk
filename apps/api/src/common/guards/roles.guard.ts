import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RoleRequirement, ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContext } from '../tenant/tenant-context';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleRequirement[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user, tenant } = context.switchToHttp().getRequest<{
      user?: { role?: UserRole };
      tenant?: TenantContext;
    }>();

    // Org-scoped routes: CurrentOrganizationGuard sets tenant, so check membershipRole only.
    // This prevents bypass — a user with global admin role cannot act as owner, and a user
    // with recipient global role cannot escalate via an admin membership.
    if (tenant) {
      return requiredRoles.some((role) => tenant.membershipRole === role);
    }

    // No tenant context (e.g., portal routes without CurrentOrganizationGuard): fall back to
    // the user's global role (used for recipient-level access).
    return requiredRoles.some((role) => user?.role === role);
  }
}
