import { Module } from '@nestjs/common';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  controllers: [QueueController],
  providers: [QueueService, CurrentOrganizationGuard, RolesGuard],
  exports: [QueueService],
})
export class QueueModule {}
