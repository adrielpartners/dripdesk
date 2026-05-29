import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser, TenantContext } from '../tenant/tenant-context';

const ORGANIZATION_HEADER = 'x-dripdesk-organization-id';

@Injectable()
export class CurrentOrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) throw new ForbiddenException('Authentication required');

    const requestedOrganizationId = this.resolveRequestedOrganizationId(request, user);

    if (!requestedOrganizationId) {
      throw new ForbiddenException('Organization context required');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: requestedOrganizationId,
          userId: user.id,
        },
      },
      select: {
        organizationId: true,
        role: true,
      },
    });

    if (!membership) throw new ForbiddenException('Organization access denied');

    const tenant: TenantContext = {
      organizationId: membership.organizationId,
      userId: user.id,
      membershipRole: membership.role,
    };

    request.tenant = tenant;
    request.user = {
      ...user,
      organizationId: membership.organizationId,
    };

    return true;
  }

  private resolveRequestedOrganizationId(request: any, user: AuthenticatedUser): string | undefined {
    const headerValue = request.headers?.[ORGANIZATION_HEADER];
    const headerOrganizationId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    return (
      request.params?.organizationId ??
      headerOrganizationId ??
      user.organizationId ??
      user.memberships?.[0]?.organizationId
    );
  }
}
