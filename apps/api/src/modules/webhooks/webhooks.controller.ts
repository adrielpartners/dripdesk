import { Body, Controller, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { WebhooksService } from './webhooks.service';
import { SubscriberIntakeService } from './subscriber-intake.service';
import { SubscriberIntakeDto } from './dto/subscriber-intake.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService, private readonly intake: SubscriberIntakeService) {}

  @Post('subscribers/:organizationId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a consenting subscriber and start a campaign enrollment' })
  async receiveSubscriber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Headers('x-dripdesk-intake-key') key: string | undefined,
    @Body() dto: SubscriberIntakeDto,
  ) {
    return ok(await this.intake.receive(organizationId, key, dto));
  }

  @Post('twilio/status')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle Twilio delivery status callbacks' })
  async handleTwilioStatus(
    @Body() body: Record<string, string | undefined>,
    @Headers('x-twilio-signature') signature: string | undefined,
  ) {
    return ok(await this.webhooks.handleTwilioStatus(body, signature));
  }

  @Post('twilio/reply')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle Twilio inbound replies' })
  async handleTwilioReply(
    @Body() body: Record<string, string | undefined>,
    @Headers('x-twilio-signature') signature: string | undefined,
  ) {
    return ok(await this.webhooks.handleTwilioReply(body, signature));
  }

  @Post('telegram/:orgId')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle Telegram bot webhook updates' })
  async handleTelegram(
    @Param('orgId') orgId: string,
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: unknown,
  ) {
    return ok(await this.webhooks.handleTelegram(orgId, secret, body as never));
  }
}
