import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, SendEmailParams } from './email-provider.interface';

@Injectable()
export class BrevoProvider implements EmailProvider {
  readonly name = 'brevo';
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.brevo.com/v3';

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('dripdesk.brevoApiKey', '');
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    const from = params.from ?? {
      email: this.config.get<string>('dripdesk.defaultFromEmail', 'noreply@dripdesk.net'),
      name: this.config.get<string>('dripdesk.defaultFromName', 'DripDesk'),
    };

    const body = {
      sender: from,
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
    };

    this.logger.debug(`Sending email via Brevo: "${params.subject}" to ${params.to.map(t => t.email).join(', ')}`);

    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Brevo API error (${response.status}): ${errorBody}`);
      throw new Error(`Brevo email send failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json() as { messageId: string };
    return { id: data.messageId };
  }
}
