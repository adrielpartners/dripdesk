import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context';
import { UpsertProviderCredentialDto, type ProviderType } from './dto/upsert-provider-credential.dto';
import { ProviderCredentialsService } from './provider-credentials.service';

@ApiTags('provider-credentials')
@Controller('provider-credentials')
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@ApiBearerAuth()
export class ProviderCredentialsController {
  constructor(private readonly providerCredentials: ProviderCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'List masked provider credentials' })
  async list(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.providerCredentials.list(tenant));
  }

  @Put(':providerType')
  @ApiOperation({ summary: 'Create or update provider credentials' })
  async upsert(
    @CurrentTenant() tenant: TenantContext,
    @Param('providerType') providerType: ProviderType,
    @Body() dto: UpsertProviderCredentialDto,
  ) {
    return ok(await this.providerCredentials.upsert(tenant, { ...dto, providerType }));
  }

  @Post(':providerType/test')
  @ApiOperation({ summary: 'Validate saved provider credential shape' })
  async test(@CurrentTenant() tenant: TenantContext, @Param('providerType') providerType: ProviderType) {
    return ok(await this.providerCredentials.test(tenant, providerType));
  }
}
