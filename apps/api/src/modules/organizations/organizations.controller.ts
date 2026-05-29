import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser, TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations available to the current user' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.organizationsService.listForUser(user.id));
  }

  @Get('current')
  @UseGuards(CurrentOrganizationGuard)
  @ApiOperation({ summary: 'Get current user organization' })
  async getCurrent(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.organizationsService.findCurrent(tenant));
  }

  @Get(':organizationId')
  @UseGuards(CurrentOrganizationGuard)
  @ApiOperation({ summary: 'Get organization by ID' })
  async findOne(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.organizationsService.findCurrent(tenant));
  }

  @Patch(':organizationId')
  @UseGuards(CurrentOrganizationGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update organization' })
  async update(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {
    return ok(await this.organizationsService.updateCurrent(tenant, dto));
  }
}
