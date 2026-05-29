import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { PersonsRepository } from './persons.repository';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [PersonsService, PersonsRepository, CurrentOrganizationGuard, RolesGuard],
  controllers: [PersonsController],
  exports: [PersonsService],
})
export class PersonsModule {}
