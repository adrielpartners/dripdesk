import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailParams } from './email-provider.interface';

@Injectable()
export class MailgunProvider implements EmailProvider {
  readonly name = 'mailgun';
  private readonly logger = new Logger(MailgunProvider.name);

  async sendEmail(_params: SendEmailParams): Promise<{ id: string }> {
    this.logger.warn('Mailgun provider not configured — email not sent. Set DRIPDESK_MAILGUN_API_KEY and DRIPDESK_MAILGUN_DOMAIN to enable.');
    return { id: 'not-configured' };
  }
}
