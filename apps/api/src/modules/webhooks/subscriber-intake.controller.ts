import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context';
import { SubscriberIntakeService } from './subscriber-intake.service';

@ApiTags('subscriber-intake')
@ApiBearerAuth()
@Controller('subscriber-intake')
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
export class SubscriberIntakeController {
  constructor(private readonly intake: SubscriberIntakeService) {}

  @Get()
  @ApiOperation({ summary: 'Check subscriber intake key configuration' })
  async settings(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.intake.settings(tenant.organizationId));
  }

  @Post('rotate-key')
  @ApiOperation({ summary: 'Generate or rotate a subscriber intake key; returned only once' })
  async rotateKey(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.intake.rotateKey(tenant.organizationId));
  }
}
