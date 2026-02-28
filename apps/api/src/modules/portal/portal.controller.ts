import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';

@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get enrollment info by access token' })
  getEnrollment(@Param('token') token: string) {
    return this.portalService.getEnrollmentByToken(token);
  }

  @Get(':token/lessons')
  @ApiOperation({ summary: 'Get lessons for enrollment' })
  getLessons(@Param('token') token: string) {
    return this.portalService.getLessons(token);
  }

  @Post(':token/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from campaign or globally' })
  unsubscribe(@Param('token') token: string, @Query('campaignId') campaignId?: string) {
    return this.portalService.unsubscribe(token, campaignId);
  }
}
