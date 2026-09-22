import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailParams } from './email-provider.interface';

@Injectable()
export class SendgridProvider implements EmailProvider {
  readonly name = 'sendgrid';
  private readonly logger = new Logger(SendgridProvider.name);

  async sendEmail(_params: SendEmailParams): Promise<{ id: string }> {
    this.logger.warn('SendGrid provider not configured — email not sent. Set DRIPDESK_SENDGRID_API_KEY to enable.');
    return { id: 'not-configured' };
  }
}
