import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context';
import { EnrollCampaignDto, EnrollPersonDto } from './dto/create-enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('enrollments/usage')
  @ApiOperation({ summary: 'Get active contact usage for the current organization' })
  async usage(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.enrollmentsService.findUsage(tenant));
  }

  @Get('campaigns/:campaignId/enrollments')
  @ApiOperation({ summary: 'List campaign enrollments' })
  async findByCampaign(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId') campaignId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return ok(await this.enrollmentsService.findByCampaign(tenant, campaignId, Number(page), Number(limit)));
  }

  @Post('campaigns/:campaignId/enrollments')
  @ApiOperation({ summary: 'Enroll a person in a campaign' })
  async enrollPersonInCampaign(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId') campaignId: string,
    @Body() dto: EnrollPersonDto,
  ) {
    return ok(await this.enrollmentsService.enrollPersonInCampaign(tenant, campaignId, dto.personId));
  }

  @Get('persons/:personId/enrollments')
  @ApiOperation({ summary: 'List person enrollments' })
  async findByPerson(
    @CurrentTenant() tenant: TenantContext,
    @Param('personId') personId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return ok(await this.enrollmentsService.findByPerson(tenant, personId, Number(page), Number(limit)));
  }

  @Post('persons/:personId/enrollments')
  @ApiOperation({ summary: 'Enroll a person in a campaign from person detail' })
  async enrollCampaignForPerson(
    @CurrentTenant() tenant: TenantContext,
    @Param('personId') personId: string,
    @Body() dto: EnrollCampaignDto,
  ) {
    return ok(await this.enrollmentsService.enrollPersonInCampaign(tenant, dto.campaignId, personId));
  }

  @Post('enrollments/:id/pause')
  @ApiOperation({ summary: 'Pause an enrollment' })
  async pause(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.enrollmentsService.pause(tenant, id));
  }

  @Delete('enrollments/:id')
  @ApiOperation({ summary: 'Remove an enrollment' })
  async remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.enrollmentsService.remove(tenant, id));
  }
}
