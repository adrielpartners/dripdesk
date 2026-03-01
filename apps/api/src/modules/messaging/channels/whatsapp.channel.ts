import { Injectable, Logger } from '@nestjs/common';
import { MessageChannel, ChannelSendData, ChannelResult } from './channel.interface';

@Injectable()
export class WhatsAppChannel implements MessageChannel {
  type = 'WHATSAPP';
  private readonly logger = new Logger(WhatsAppChannel.name);

  async send(data: ChannelSendData): Promise<ChannelResult> {
    const { organization, recipient, content, mediaUrl } = data;

    if (!organization.whatsappToken || !organization.whatsappPhoneId) {
      return { success: false, error: 'WhatsApp Business API credentials not configured' };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${organization.whatsappPhoneId}/messages`;

      const body: any = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: content },
      };

      if (mediaUrl) {
        body.type = 'image';
        body.image = { link: mediaUrl, caption: content };
        delete body.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${organization.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(JSON.stringify(err));
      }

      const result: any = await response.json();

      return {
        success: true,
        providerMessageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      this.logger.error(`WhatsApp send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
