import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/tenant/tenant-context';
import { PortalService } from './portal.service';

@ApiTags('portal')
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('recipient')
@ApiBearerAuth()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get()
  @ApiOperation({ summary: 'Get recipient dashboard data' })
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.portalService.getDashboard(user));
  }

  @Get('campaigns/:campaignId')
  @ApiOperation({ summary: 'Get recipient campaign detail' })
  async campaign(@CurrentUser() user: AuthenticatedUser, @Param('campaignId') campaignId: string) {
    return ok(await this.portalService.getCampaign(user, campaignId));
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get recipient channel settings' })
  async settings(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.portalService.getSettings(user));
  }

  @Post('campaigns/:campaignId/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe recipient from one campaign' })
  async unsubscribeCampaign(@CurrentUser() user: AuthenticatedUser, @Param('campaignId') campaignId: string) {
    return ok(await this.portalService.unsubscribeFromCampaign(user, campaignId));
  }

  @Post('unsubscribe-all')
  @ApiOperation({ summary: 'Unsubscribe recipient from all campaigns and channels' })
  async unsubscribeAll(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.portalService.unsubscribeAll(user));
  }
}
