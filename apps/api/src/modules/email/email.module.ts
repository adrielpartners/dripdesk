import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { BrevoProvider } from './providers/brevo.provider';
import { PostmarkProvider } from './providers/postmark.provider';
import { MailgunProvider } from './providers/mailgun.provider';
import { SendgridProvider } from './providers/sendgrid.provider';

@Module({
  providers: [
    EmailService,
    BrevoProvider,
    PostmarkProvider,
    MailgunProvider,
    SendgridProvider,
  ],
  exports: [EmailService],
})
export class EmailModule {}