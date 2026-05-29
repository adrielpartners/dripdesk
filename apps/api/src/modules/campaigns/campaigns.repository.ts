import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyForTenant(tenant: TenantContext, page: number, limit: number) {
    const where: Prisma.CampaignWhereInput = {
      organizationId: tenant.organizationId,
      status: { not: 'archived' },
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: { _count: { select: { steps: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdForTenant(tenant: TenantContext, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
        status: { not: 'archived' },
      },
      include: { steps: { where: { status: { not: 'archived' } }, orderBy: { stepOrder: 'asc' } } },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  createForTenant(tenant: TenantContext, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        organizationId: tenant.organizationId,
        createdById: tenant.userId,
        name: dto.name,
        description: dto.description,
        scheduleType: dto.scheduleType ?? 'daily',
        scheduleConfig: this.scheduleConfigJson(dto.scheduleConfig),
        progressRule: dto.progressRule ?? 'time_based',
        mode: dto.mode ?? 'standard',
        defaultChannels: dto.defaultChannels?.length ? dto.defaultChannels : ['email'],
      },
    });
  }

  async updateForTenant(tenant: TenantContext, id: string, dto: UpdateCampaignDto) {
    await this.findByIdForTenant(tenant, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        scheduleType: dto.scheduleType,
        scheduleConfig: this.scheduleConfigJson(dto.scheduleConfig),
        progressRule: dto.progressRule,
        mode: dto.mode,
        defaultChannels: dto.defaultChannels,
      },
      include: { steps: { where: { status: { not: 'archived' } }, orderBy: { stepOrder: 'asc' } } },
    });
  }

  async activateForTenant(tenant: TenantContext, id: string) {
    await this.findByIdForTenant(tenant, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'active', activatedAt: new Date() },
      include: { steps: { where: { status: { not: 'archived' } }, orderBy: { stepOrder: 'asc' } } },
    });
  }

  async archiveForTenant(tenant: TenantContext, id: string) {
    await this.findByIdForTenant(tenant, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  private scheduleConfigJson(config: CreateCampaignDto['scheduleConfig']): Prisma.InputJsonValue | undefined {
    return config ? { ...config } : undefined;
  }
}
