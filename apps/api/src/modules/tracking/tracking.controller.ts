import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';

interface TrackingRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface RedirectResponse {
  redirect(statusCode: number, url: string): void;
}

@ApiTags('tracking')
@Controller('l')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':token')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle tracked link redirect' })
  async redirect(@Param('token') token: string, @Req() req: TrackingRequest, @Res() res: RedirectResponse) {
    const originalUrl = await this.trackingService.handleLinkClick(token, {
      ipAddress: req.ip,
      userAgent: normalizeHeader(req.headers['user-agent']),
    });

    return res.redirect(302, originalUrl);
  }
}

function normalizeHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  return value;
}
