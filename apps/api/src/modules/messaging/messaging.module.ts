import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { SmsChannel } from './channels/sms.channel';
import { EmailChannel } from './channels/email.channel';
import { TelegramChannel } from './channels/telegram.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';

@Module({
  providers: [MessagingService, SmsChannel, EmailChannel, TelegramChannel, WhatsAppChannel],
  exports: [MessagingService],
})
export class MessagingModule {}
