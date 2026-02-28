import { Controller, Post, Body, Headers, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  @Post('twilio')
  @ApiOperation({ summary: 'Handle Twilio status callbacks' })
  handleTwilio(@Body() body: any) {
    this.logger.log(`Twilio webhook: ${body.MessageStatus} for ${body.MessageSid}`);
    return { received: true };
  }

  @Post('telegram/:orgId')
  @ApiOperation({ summary: 'Handle Telegram bot webhook updates' })
  handleTelegram(@Param('orgId') orgId: string, @Body() body: any) {
    this.logger.log(`Telegram webhook for org ${orgId}`);
    return { received: true };
  }
}
