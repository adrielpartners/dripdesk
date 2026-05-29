import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { StepsRepository } from './steps.repository';

@Injectable()
export class StepsService {
  constructor(private readonly steps: StepsRepository) {}

  findByCampaign(tenant: TenantContext, campaignId: string) {
    return this.steps.findManyForCampaign(tenant, campaignId);
  }

  create(tenant: TenantContext, campaignId: string, dto: CreateStepDto) {
    if (dto.status === 'published') {
      this.assertPublishable(dto);
    }

    return this.steps.createForCampaign(tenant, campaignId, this.normalizeStep(dto));
  }

  update(tenant: TenantContext, id: string, dto: UpdateStepDto) {
    if (dto.status === 'published') {
      this.assertPublishable(dto);
    }

    return this.steps.updateForTenant(tenant, id, this.normalizeStep(dto));
  }

  archive(tenant: TenantContext, id: string) {
    return this.steps.archiveForTenant(tenant, id);
  }

  reorder(tenant: TenantContext, campaignId: string, stepIds: string[]) {
    return this.steps.reorderForCampaign(tenant, campaignId, stepIds);
  }

  private normalizeStep<T extends CreateStepDto | UpdateStepDto>(dto: T): T {
    return {
      ...dto,
      title: dto.title?.trim(),
      defaultContent: dto.defaultContent?.trim(),
      smsContent: dto.smsContent?.trim(),
      telegramContent: dto.telegramContent?.trim(),
      emailSubject: dto.emailSubject?.trim(),
      emailBody: dto.emailBody?.trim(),
      replyRequiredPhrases: dto.replyRequiredPhrases?.map((phrase) => phrase.trim()).filter(Boolean),
    };
  }

  private assertPublishable(dto: CreateStepDto | UpdateStepDto) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Published steps require a title');
    }

    if (!dto.defaultContent && !dto.smsContent && !dto.telegramContent && !dto.emailSubject && !dto.emailBody) {
      throw new BadRequestException('Published steps require content');
    }
  }
}
