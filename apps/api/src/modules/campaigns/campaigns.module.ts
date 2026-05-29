import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsRepository } from './campaigns.repository';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [CampaignsService, CampaignsRepository, CurrentOrganizationGuard, RolesGuard],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
