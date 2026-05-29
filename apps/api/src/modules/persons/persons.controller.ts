import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonChannelDto } from './dto/person-channel.dto';

@ApiTags('persons')
@Controller('persons')
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@ApiBearerAuth()
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  @ApiOperation({ summary: 'List organization persons' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    return ok(await this.personsService.findAll(tenant, Number(page), Number(limit), search));
  }

  @Post()
  @ApiOperation({ summary: 'Create a person' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreatePersonDto) {
    return ok(await this.personsService.create(tenant, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.personsService.findOne(tenant, id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a person' })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return ok(await this.personsService.update(tenant, id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a person' })
  async archive(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.personsService.archive(tenant, id));
  }

  @Post(':id/request-deletion')
  @ApiOperation({ summary: 'Mark a person deletion request' })
  async requestDeletion(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return ok(await this.personsService.requestDeletion(tenant, id));
  }

  @Post(':id/channels')
  @ApiOperation({ summary: 'Add a person channel' })
  async addChannel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') personId: string,
    @Body() dto: PersonChannelDto,
  ) {
    return ok(await this.personsService.addChannel(tenant, personId, dto));
  }

  @Patch(':id/channels/:channelId')
  @ApiOperation({ summary: 'Update or enable/disable a person channel' })
  async updateChannel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') personId: string,
    @Param('channelId') channelId: string,
    @Body() dto: Partial<PersonChannelDto>,
  ) {
    return ok(await this.personsService.updateChannel(tenant, personId, channelId, dto));
  }
}

