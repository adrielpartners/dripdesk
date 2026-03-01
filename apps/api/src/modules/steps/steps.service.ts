import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStepDto } from './dto/create-step.dto';
import { PartialType } from '@nestjs/mapped-types';
import { CreateStepDto as UpdateStepDtoBase } from './dto/create-step.dto';

class UpdateStepDto extends PartialType(UpdateStepDtoBase) {}

@Injectable()
export class StepsService {
  constructor(private prisma: PrismaService) {}

  async findByCampaign(campaignId: string, orgId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.step.findMany({
      where: { campaignId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async create(campaignId: string, orgId: string, dto: CreateStepDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const maxOrder = await this.prisma.step.aggregate({
      where: { campaignId, deletedAt: null },
      _max: { order: true },
    });

    const order = (maxOrder._max.order ?? 0) + 1;

    return this.prisma.step.create({
      data: {
        campaignId,
        order,
        name: dto.name,
        delayDays: dto.delayDays ?? 1,
        smsContent: dto.smsContent,
        smsMediaUrl: dto.smsMediaUrl,
        telegramContent: dto.telegramContent,
        telegramParseMode: dto.telegramParseMode ?? 'HTML',
        telegramMediaUrl: dto.telegramMediaUrl,
        whatsappContent: dto.whatsappContent,
        whatsappMediaType: dto.whatsappMediaType,
        whatsappMediaUrl: dto.whatsappMediaUrl,
        emailSubject: dto.emailSubject,
        emailHtmlContent: dto.emailHtmlContent,
        emailTextContent: dto.emailTextContent,
        externalLinkUrl: dto.externalLinkUrl,
        sendTimeOverride: dto.sendTimeOverride,
      },
    });
  }

  async update(id: string, orgId: string, dto: Partial<CreateStepDto>) {
    const step = await this.prisma.step.findFirst({
      where: { id, deletedAt: null, campaign: { organizationId: orgId } },
    });

    if (!step) throw new NotFoundException('Step not found');

    return this.prisma.step.update({ where: { id }, data: dto });
  }

  async remove(id: string, orgId: string) {
    const step = await this.prisma.step.findFirst({
      where: { id, deletedAt: null, campaign: { organizationId: orgId } },
    });

    if (!step) throw new NotFoundException('Step not found');

    return this.prisma.step.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(campaignId: string, orgId: string, stepIds: string[]) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    await Promise.all(
      stepIds.map((stepId, index) =>
        this.prisma.step.update({
          where: { id: stepId },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findByCampaign(campaignId, orgId);
  }
}
