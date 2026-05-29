import { Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context';
import { QueueService } from './queue.service';

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
@Roles('owner', 'admin')
@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly config: ConfigService,
  ) {}

  @Post('test')
  @ApiOperation({ summary: 'Enqueue a Phase 11 test job (dev only)' })
  async enqueueTestJob(@CurrentTenant() tenant: TenantContext) {
    const isProduction = this.config.get<string>('dripdesk.env') === 'production';
    if (isProduction) {
      return ok({ message: 'Test endpoint is not available in production' });
    }
    return ok(await this.queueService.enqueueTestJob(tenant));
  }
}
