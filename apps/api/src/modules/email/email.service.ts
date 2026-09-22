import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, SendEmailParams } from './providers/email-provider.interface';
import { BrevoProvider } from './providers/brevo.provider';
import { PostmarkProvider } from './providers/postmark.provider';
import { MailgunProvider } from './providers/mailgun.provider';
import { SendgridProvider } from './providers/sendgrid.provider';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private provider!: EmailProvider;

  private readonly providers: Record<string, EmailProvider>;

  constructor(
    private readonly config: ConfigService,
    brevo: BrevoProvider,
    postmark: PostmarkProvider,
    mailgun: MailgunProvider,
    sendgrid: SendgridProvider,
  ) {
    this.providers = {
      brevo,
      postmark,
      mailgun,
      sendgrid,
    };
  }

  onModuleInit() {
    const providerName = this.config.get<string>('dripdesk.emailProvider', 'brevo');
    const selected = this.providers[providerName];

    if (!selected) {
      this.logger.warn(`Unknown email provider "${providerName}", falling back to brevo`);
      this.provider = this.providers['brevo'];
    } else {
      this.provider = selected;
    }

    this.logger.log(`Email provider: ${this.provider.name}`);
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    return this.provider.sendEmail(params);
  }

  async sendWelcomeEmail(email: string, firstName?: string | null): Promise<{ id: string }> {
    const name = firstName || 'there';
    const htmlContent = this.buildWelcomeHtml(name);

    return this.sendEmail({
      to: [{ email, name: firstName || undefined }],
      subject: 'Welcome to DripDesk — your account is ready',
      htmlContent,
    });
  }

  private buildWelcomeHtml(name: string): string {
    const webUrl = this.config.get<string>('dripdesk.publicWebUrl', 'https://app.dripdesk.net');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf9;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17211b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(23,33,27,0.06);">
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#17211b;">Welcome to DripDesk</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#68776f;">Hi ${name},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#37443d;">
            Your DripDesk account is ready. You can start building drip campaigns, add contacts,
            and deliver micro-courses through SMS, Telegram, and email right away.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#247d4c;border-radius:6px;padding:12px 24px;">
              <a href="${webUrl}/admin" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none;">Go to your dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#68776f;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#eef2ef;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#68776f;text-align:center;">DripDesk — micro-course delivery, simplified.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}