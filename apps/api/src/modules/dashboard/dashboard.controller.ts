import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard stats' })
  getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user.organizationId);
  }

  @Get('campaigns/:id/analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  getCampaignAnalytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dashboardService.getCampaignAnalytics(id, user.organizationId);
  }
}
