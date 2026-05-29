import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [UsersService, CurrentOrganizationGuard, RolesGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
