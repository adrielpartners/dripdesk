import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Injectable()
export class StepsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCampaignForTenant(tenant: TenantContext, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: tenant.organizationId,
        status: { not: 'archived' },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async findManyForCampaign(tenant: TenantContext, campaignId: string) {
    await this.findCampaignForTenant(tenant, campaignId);
    return this.prisma.campaignStep.findMany({
      where: { campaignId, status: { not: 'archived' } },
      orderBy: { stepOrder: 'asc' },
    });
  }

  async createForCampaign(tenant: TenantContext, campaignId: string, dto: CreateStepDto) {
    await this.findCampaignForTenant(tenant, campaignId);
    const maxOrder = await this.prisma.campaignStep.aggregate({
      where: { campaignId, status: { not: 'archived' } },
      _max: { stepOrder: true },
    });

    return this.prisma.campaignStep.create({
      data: {
        campaignId,
        stepOrder: (maxOrder._max.stepOrder ?? 0) + 1,
        title: dto.title,
        status: dto.status ?? 'draft',
        defaultContent: dto.defaultContent,
        smsContent: dto.smsContent,
        telegramContent: dto.telegramContent,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        delayDaysOverride: dto.delayDaysOverride,
        channelOverrides: dto.channelOverrides ?? [],
        replyRequiredPhrases: dto.replyRequiredPhrases ?? [],
      },
    });
  }

  async updateForTenant(tenant: TenantContext, id: string, dto: UpdateStepDto) {
    const step = await this.findStepForTenant(tenant, id);
    return this.prisma.campaignStep.update({
      where: { id: step.id },
      data: {
        title: dto.title,
        status: dto.status,
        defaultContent: dto.defaultContent,
        smsContent: dto.smsContent,
        telegramContent: dto.telegramContent,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        delayDaysOverride: dto.delayDaysOverride,
        channelOverrides: dto.channelOverrides,
        replyRequiredPhrases: dto.replyRequiredPhrases,
      },
    });
  }

  async archiveForTenant(tenant: TenantContext, id: string) {
    const step = await this.findStepForTenant(tenant, id);
    return this.prisma.campaignStep.update({
      where: { id: step.id },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  async reorderForCampaign(tenant: TenantContext, campaignId: string, stepIds: string[]) {
    await this.findCampaignForTenant(tenant, campaignId);
    const existingSteps = await this.prisma.campaignStep.findMany({
      where: {
        campaignId,
        status: { not: 'archived' },
      },
      select: { id: true },
    });
    const existingStepIds = new Set(existingSteps.map((step) => step.id));

    if (stepIds.length !== existingStepIds.size || stepIds.some((stepId) => !existingStepIds.has(stepId))) {
      throw new NotFoundException('Step reorder list must include every active campaign step');
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        stepIds.map((stepId, index) =>
          tx.campaignStep.update({
            where: { id: stepId },
            data: { stepOrder: -(index + 1) },
          }),
        ),
      );

      await Promise.all(
        stepIds.map((stepId, index) =>
          tx.campaignStep.update({
            where: { id: stepId },
            data: { stepOrder: index + 1 },
          }),
        ),
      );
    });

    return this.findManyForCampaign(tenant, campaignId);
  }

  private async findStepForTenant(tenant: TenantContext, id: string) {
    const step = await this.prisma.campaignStep.findFirst({
      where: {
        id,
        status: { not: 'archived' },
        campaign: {
          organizationId: tenant.organizationId,
          status: { not: 'archived' },
        },
      },
    });

    if (!step) throw new NotFoundException('Campaign step not found');
    return step;
  }
}
