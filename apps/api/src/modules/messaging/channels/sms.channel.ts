import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { MessageChannel, ChannelSendData, ChannelResult } from './channel.interface';

@Injectable()
export class SmsChannel implements MessageChannel {
  type = 'SMS';
  private readonly logger = new Logger(SmsChannel.name);

  async send(data: ChannelSendData): Promise<ChannelResult> {
    const { organization, recipient, content, mediaUrl } = data;

    if (!organization.twilioAccountSid || !organization.twilioAuthToken) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    try {
      const client = Twilio(organization.twilioAccountSid, organization.twilioAuthToken);

      const messageData: any = {
        body: content,
        from: organization.twilioPhoneNumber!,
        to: recipient,
      };

      if (mediaUrl) {
        messageData.mediaUrl = [mediaUrl];
      }

      const message = await client.messages.create(messageData);

      return { success: true, providerMessageId: message.sid };
    } catch (error) {
      this.logger.error(`SMS send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
