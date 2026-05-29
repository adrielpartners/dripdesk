import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('team')
  @UseGuards(CurrentOrganizationGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List team members' })
  async getTeam(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.usersService.findByOrganization(tenant));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: { firstName?: string; lastName?: string },
  ) {
    return ok(await this.usersService.update(user.id, body));
  }
}
