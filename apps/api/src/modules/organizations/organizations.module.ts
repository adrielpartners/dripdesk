import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [OrganizationsService, OrganizationsRepository, CurrentOrganizationGuard, RolesGuard],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
