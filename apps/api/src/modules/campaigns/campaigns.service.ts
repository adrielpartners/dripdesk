import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignsRepository } from './campaigns.repository';

@Injectable()
export class CampaignsService {
  constructor(private readonly campaigns: CampaignsRepository) {}

  findAll(tenant: TenantContext, page = 1, limit = 20) {
    return this.campaigns.findManyForTenant(tenant, Math.max(1, page), Math.min(Math.max(1, limit), 100));
  }

  findOne(tenant: TenantContext, id: string) {
    return this.campaigns.findByIdForTenant(tenant, id);
  }

  create(tenant: TenantContext, dto: CreateCampaignDto) {
    this.validateChannels(dto.defaultChannels);
    return this.campaigns.createForTenant(tenant, this.normalizeCampaign(dto));
  }

  update(tenant: TenantContext, id: string, dto: UpdateCampaignDto) {
    this.validateChannels(dto.defaultChannels);
    return this.campaigns.updateForTenant(tenant, id, this.normalizeCampaign(dto));
  }

  async activate(tenant: TenantContext, id: string) {
    const campaign = await this.campaigns.findByIdForTenant(tenant, id);
    const hasUsableStep = campaign.steps.some((step) => {
      return (
        step.status !== 'archived' &&
        Boolean(
          step.defaultContent ||
            step.smsContent ||
            step.telegramContent ||
            step.emailSubject ||
            step.emailBody,
        )
      );
    });

    if (!campaign.name.trim()) {
      throw new BadRequestException('Campaign name is required');
    }

    if (campaign.defaultChannels.length === 0) {
      throw new BadRequestException('Campaign must have at least one default channel');
    }

    if (!hasUsableStep) {
      throw new BadRequestException('Campaign must have at least one step with content before activation');
    }

    return this.campaigns.activateForTenant(tenant, id);
  }

  archive(tenant: TenantContext, id: string) {
    return this.campaigns.archiveForTenant(tenant, id);
  }

  private normalizeCampaign<T extends CreateCampaignDto | UpdateCampaignDto>(dto: T): T {
    return {
      ...dto,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      scheduleConfig: this.normalizeScheduleConfig(dto.scheduleConfig),
    };
  }

  private normalizeScheduleConfig(config: CreateCampaignDto['scheduleConfig']) {
    if (!config) return undefined;

    return {
      sendTime: typeof config.sendTime === 'string' ? config.sendTime.trim() : undefined,
      intervalDays: typeof config.intervalDays === 'number' ? config.intervalDays : undefined,
      daysOfWeek: Array.isArray(config.daysOfWeek)
        ? config.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : undefined,
    };
  }

  private validateChannels(channels?: string[]) {
    if (!channels) return;
    if (channels.length === 0) throw new BadRequestException('At least one default channel is required');
  }
}
