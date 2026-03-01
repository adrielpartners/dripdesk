import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { TrackingService } from './tracking.service';

@ApiTags('tracking')
@Controller('l')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Handle tracked link redirect' })
  async redirect(
    @Param('token') token: string,
    @Query('e') enrollmentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const originalUrl = await this.trackingService.handleLinkClick(token, enrollmentId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.redirect(302, originalUrl);
  }
}
