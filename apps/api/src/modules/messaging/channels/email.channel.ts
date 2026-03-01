import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MessageChannel, ChannelSendData, ChannelResult } from './channel.interface';

@Injectable()
export class EmailChannel implements MessageChannel {
  type = 'EMAIL';
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private config: ConfigService) {}

  async send(data: ChannelSendData): Promise<ChannelResult> {
    const { organization, recipient, content, subject } = data;

    try {
      const transporter = this.createTransporter(organization);

      const info = await transporter.sendMail({
        from: `${this.config.get('DEFAULT_FROM_NAME', 'DripDesk')} <${
          organization.defaultSenderEmail ?? this.config.get('DEFAULT_FROM_EMAIL', 'noreply@dripdesk.com')
        }>`,
        to: recipient,
        subject: subject ?? 'New message',
        html: content,
        text: this.stripHtml(content),
      });

      return { success: true, providerMessageId: info.messageId };
    } catch (error) {
      this.logger.error(`Email send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private createTransporter(organization: any) {
    if (organization.smtpHost) {
      return nodemailer.createTransport({
        host: organization.smtpHost,
        port: organization.smtpPort ?? 587,
        secure: (organization.smtpPort ?? 587) === 465,
        auth: {
          user: organization.smtpUser,
          pass: organization.smtpPassword,
        },
      });
    }

    return nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.brevo.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASSWORD'),
      },
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
