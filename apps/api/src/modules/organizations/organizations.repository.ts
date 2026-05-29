import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findForTenant(tenant: TenantContext) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenant.organizationId },
    });

    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  updateForTenant(tenant: TenantContext, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: tenant.organizationId },
      data: {
        name: dto.name,
        defaultTimezone: dto.defaultTimezone,
      },
    });
  }
}
