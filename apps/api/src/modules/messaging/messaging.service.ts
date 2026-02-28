import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsChannel } from './channels/sms.channel';
import { EmailChannel } from './channels/email.channel';
import { TelegramChannel } from './channels/telegram.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { MessageChannel } from './channels/channel.interface';
import { MessageStatus } from '@prisma/client';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private channels: Map<string, MessageChannel>;

  constructor(
    private prisma: PrismaService,
    private smsChannel: SmsChannel,
    private emailChannel: EmailChannel,
    private telegramChannel: TelegramChannel,
    private whatsappChannel: WhatsAppChannel,
  ) {
    this.channels = new Map([
      ['SMS', smsChannel],
      ['EMAIL', emailChannel],
      ['TELEGRAM', telegramChannel],
      ['WHATSAPP', whatsappChannel],
    ]);
  }

  async sendStepMessage(enrollmentId: string, stepId: string, channelTypes: string[]) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        person: { include: { channels: true } },
        campaign: { include: { organization: true } },
      },
    });

    if (!enrollment) {
      this.logger.error(`Enrollment ${enrollmentId} not found`);
      return [];
    }

    if (enrollment.status !== 'ACTIVE') {
      this.logger.log(`Skipping message for non-active enrollment ${enrollmentId}`);
      return [];
    }

    const step = await this.prisma.step.findUnique({ where: { id: stepId } });

    if (!step || step.deletedAt) {
      this.logger.warn(`Step ${stepId} not found or deleted`);
      return [];
    }

    const org = enrollment.campaign.organization;
    const results: Array<{ channel: string; success: boolean; error?: string }> = [];

    for (const channelType of channelTypes) {
      const channel = this.channels.get(channelType);

      if (!channel) continue;

      const personChannel = enrollment.person.channels.find(
        (c) => c.channel === channelType && !c.optedOut,
      );

      if (!personChannel) continue;

      if (enrollment.person.globallyUnsubscribed) continue;

      const content = this.getContentForChannel(step, channelType);

      if (!content.text && !content.mediaUrl) continue;

      const outbox = await this.prisma.messageOutbox.create({
        data: {
          enrollmentId,
          stepId,
          channel: channelType,
          recipientId: enrollment.personId,
          recipientAddress: personChannel.identifier,
          subject: content.subject,
          contentPreview: content.text?.substring(0, 500),
          status: MessageStatus.SENDING,
        },
      });

      try {
        const result = await channel.send({
          organization: org,
          recipient: personChannel.identifier,
          content: content.text ?? '',
          subject: content.subject,
          mediaUrl: content.mediaUrl,
          parseMode: content.parseMode,
        });

        await this.prisma.messageOutbox.update({
          where: { id: outbox.id },
          data: {
            status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            providerMessageId: result.providerMessageId,
            errorMessage: result.error,
            sentAt: result.success ? new Date() : undefined,
          },
        });

        await this.prisma.messageEvent.create({
          data: {
            messageId: outbox.id,
            eventType: result.success ? 'SENT' : 'FAILED',
            eventData: { providerMessageId: result.providerMessageId, error: result.error },
          },
        });

        results.push({ channel: channelType, success: result.success, error: result.error });
      } catch (error) {
        this.logger.error(`Error sending via ${channelType}: ${error.message}`);

        await this.prisma.messageOutbox.update({
          where: { id: outbox.id },
          data: { status: MessageStatus.FAILED, errorMessage: error.message },
        });

        results.push({ channel: channelType, success: false, error: error.message });
      }
    }

    await this.updateStepState(enrollmentId, stepId);

    return results;
  }

  private async updateStepState(enrollmentId: string, stepId: string) {
    await this.prisma.enrollmentStepState.updateMany({
      where: { enrollmentId, stepId, status: 'QUEUED' },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  private getContentForChannel(step: any, channelType: string) {
    switch (channelType) {
      case 'SMS':
        return {
          text: step.smsContent,
          mediaUrl: step.smsMediaUrl,
        };
      case 'EMAIL':
        return {
          subject: step.emailSubject,
          text: step.emailHtmlContent ?? step.emailTextContent,
          mediaUrl: undefined,
        };
      case 'TELEGRAM':
        return {
          text: step.telegramContent,
          mediaUrl: step.telegramMediaUrl,
          parseMode: step.telegramParseMode,
        };
      case 'WHATSAPP':
        return {
          text: step.whatsappContent,
          mediaUrl: step.whatsappMediaUrl,
        };
      default:
        return { text: undefined, mediaUrl: undefined };
    }
  }
}
