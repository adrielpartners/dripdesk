import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List organization campaigns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return ok(await this.campaignsService.findAll(tenant, Number(page), Number(limit)));
  }

  @Post()
  @ApiOperation({ summary: 'Create a campaign' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCampaignDto) {
    return ok(await this.campaignsService.create(tenant, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.campaignsService.findOne(tenant, id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return ok(await this.campaignsService.update(tenant, id, dto));
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a campaign when valid' })
  async activate(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.campaignsService.activate(tenant, id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a campaign' })
  async archive(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.campaignsService.archive(tenant, id));
  }
}

