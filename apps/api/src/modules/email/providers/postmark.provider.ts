import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailParams } from './email-provider.interface';

@Injectable()
export class PostmarkProvider implements EmailProvider {
  readonly name = 'postmark';
  private readonly logger = new Logger(PostmarkProvider.name);

  async sendEmail(_params: SendEmailParams): Promise<{ id: string }> {
    this.logger.warn('Postmark provider not configured — email not sent. Set DRIPDESK_POSTMARK_API_KEY to enable.');
    return { id: 'not-configured' };
  }
}
