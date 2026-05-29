import { Module } from '@nestjs/common';
import { StepsService } from './steps.service';
import { StepsController } from './steps.controller';
import { StepsRepository } from './steps.repository';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [StepsService, StepsRepository, CurrentOrganizationGuard, RolesGuard],
  controllers: [StepsController],
  exports: [StepsService],
})
export class StepsModule {}
