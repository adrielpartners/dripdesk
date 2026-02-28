import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          _count: { select: { steps: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where: { organizationId: orgId, deletedAt: null } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(orgId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        scheduleType: dto.scheduleType ?? 'DAILY',
        customSchedule: dto.customSchedule,
        timezone: dto.timezone ?? 'UTC',
        sendTime: dto.sendTime ?? '09:00',
        completionMode: dto.completionMode ?? 'TIME_BASED',
        completionDays: dto.completionDays ?? 1,
        channelsEnabled: dto.channelsEnabled,
      },
    });
  }

  async update(id: string, orgId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id, orgId);

    if (campaign.status === CampaignStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived campaign');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: dto,
    });
  }

  async publish(id: string, orgId: string) {
    const campaign = await this.findOne(id, orgId);

    const stepCount = await this.prisma.step.count({
      where: { campaignId: id, deletedAt: null },
    });

    if (stepCount === 0) {
      throw new BadRequestException('Campaign must have at least one step before publishing');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE, publishedAt: new Date() },
    });
  }

  async pause(id: string, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async archive(id: string, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED, archivedAt: new Date() },
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
