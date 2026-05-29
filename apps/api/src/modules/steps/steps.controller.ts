import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@ApiTags('steps')
@Controller()
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@ApiBearerAuth()
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Get('campaigns/:campaignId/steps')
  @ApiOperation({ summary: 'List campaign steps' })
  async findByCampaign(@CurrentTenant() tenant: TenantContext, @Param('campaignId') campaignId: string) {
    return ok(await this.stepsService.findByCampaign(tenant, campaignId));
  }

  @Post('campaigns/:campaignId/steps')
  @ApiOperation({ summary: 'Create a campaign step' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateStepDto,
  ) {
    return ok(await this.stepsService.create(tenant, campaignId, dto));
  }

  @Post('campaigns/:campaignId/steps/reorder')
  @ApiOperation({ summary: 'Reorder campaign steps' })
  async reorder(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId') campaignId: string,
    @Body() dto: ReorderStepsDto,
  ) {
    return ok(await this.stepsService.reorder(tenant, campaignId, dto.stepIds));
  }

  @Patch('steps/:id')
  @ApiOperation({ summary: 'Update a campaign step' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateStepDto) {
    return ok(await this.stepsService.update(tenant, id, dto));
  }

  @Delete('steps/:id')
  @ApiOperation({ summary: 'Archive a campaign step' })
  async archive(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.stepsService.archive(tenant, id));
  }
}

