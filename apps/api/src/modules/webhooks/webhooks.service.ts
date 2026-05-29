import { createHmac, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProgressService, ProviderCredentialStore, type TelegramConfig, verifySharedSecret } from '@dripdesk/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly progress: ProgressService;
  private readonly credentials: ProviderCredentialStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.progress = new ProgressService(prisma);
    this.credentials = new ProviderCredentialStore(prisma);
  }

  async handleTwilioStatus(body: Record<string, string | undefined>, signature?: string) {
    const providerMessageId = body.MessageSid;
    const organizationId = await this.resolveAndVerifyTwilioOrganization(body, signature, 'status');
    if (!providerMessageId || !organizationId) return { received: true, resolved: false };

    const outbox = await this.prisma.messageOutbox.findFirst({ where: { organizationId, providerMessageId } });
    if (!outbox) return { received: true, resolved: false };

    const eventType = body.MessageStatus === 'failed' || body.MessageStatus === 'undelivered' ? 'failed' : 'delivered';
    await this.prisma.messageEvent.create({
      data: {
        organizationId: outbox.organizationId,
        enrollmentId: outbox.enrollmentId,
        messageOutboxId: outbox.id,
        eventType,
        metadata: {
          provider: 'twilio',
          status: body.MessageStatus,
        },
      },
    });

    return { received: true, resolved: true };
  }

  async handleTwilioReply(body: Record<string, string | undefined>, signature?: string) {
    const from = body.From;
    const text = body.Body;
    const organizationId = await this.resolveAndVerifyTwilioOrganization(body, signature, 'reply');
    if (!from || !text || !organizationId) return { received: true, resolved: false };

    const channel = await this.prisma.personChannel.findFirst({
      where: {
        organizationId,
        channelType: 'sms',
        address: from,
        person: {
          enrollments: { some: { status: 'active' } },
        },
      },
      include: {
        person: {
          include: {
            enrollments: {
              where: { status: 'active' },
              include: {
                stepStates: true,
              },
            },
          },
        },
      },
    });

    const enrollment = channel?.person.enrollments[0];
    if (!channel || !enrollment) return { received: true, resolved: false };
    const state = enrollment.stepStates.find((item) => item.stepOrder === enrollment.currentStepOrder);
    if (!state) return { received: true, resolved: false };

    await this.recordReply({
      organizationId,
      enrollmentId: enrollment.id,
      campaignStepId: state.campaignStepId,
      provider: 'twilio',
      text,
      providerMessageId: body.MessageSid,
    });

    await this.progress.evaluateEnrollment(enrollment.id);
    return { received: true, resolved: true };
  }

  async handleTelegram(orgId: string, providedSecret: string | undefined, body: TelegramUpdate) {
    const config = await this.credentials.getConfig<TelegramConfig>(orgId, 'telegram');

    if (config?.webhookSecret && !verifySharedSecret(providedSecret, config.webhookSecret)) {
      return { received: false, resolved: false };
    }

    const message = body.message;
    const chatId = message?.chat?.id?.toString();
    const text = message?.text;
    if (!chatId || !text) return { received: true, resolved: false };

    const channel = await this.prisma.personChannel.findFirst({
      where: {
        organizationId: orgId,
        channelType: 'telegram',
        address: chatId,
        person: { enrollments: { some: { status: 'active' } } },
      },
      include: {
        person: {
          include: {
            enrollments: {
              where: { status: 'active' },
              include: { stepStates: true },
            },
          },
        },
      },
    });

    const enrollment = channel?.person.enrollments[0];
    if (!channel || !enrollment) return { received: true, resolved: false };
    const state = enrollment.stepStates.find((item) => item.stepOrder === enrollment.currentStepOrder);
    if (!state) return { received: true, resolved: false };

    await this.recordReply({
      organizationId: orgId,
      enrollmentId: enrollment.id,
      campaignStepId: state.campaignStepId,
      provider: 'telegram',
      text,
      providerMessageId: message?.message_id?.toString(),
    });

    await this.progress.evaluateEnrollment(enrollment.id);
    return { received: true, resolved: true };
  }

  private async recordReply(input: {
    organizationId: string;
    enrollmentId: string;
    campaignStepId: string;
    provider: string;
    text: string;
    providerMessageId?: string;
  }) {
    const outbox = await this.prisma.messageOutbox.findFirst({
      where: {
        enrollmentId: input.enrollmentId,
        campaignStepId: input.campaignStepId,
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.prisma.$transaction([
      this.prisma.messageEvent.create({
        data: {
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          messageOutboxId: outbox?.id,
          eventType: 'replied',
          metadata: {
            provider: input.provider,
            text: sanitizeReplyText(input.text),
            providerMessageId: input.providerMessageId,
          },
        },
      }),
      this.prisma.enrollmentStepState.updateMany({
        where: {
          enrollmentId: input.enrollmentId,
          campaignStepId: input.campaignStepId,
        },
        data: {
          status: 'replied',
          repliedAt: new Date(),
        },
      }),
    ]);
  }

  private async resolveAndVerifyTwilioOrganization(
    body: Record<string, string | undefined>,
    signature: string | undefined,
    webhookType: 'status' | 'reply',
  ) {
    const accountSid = body.AccountSid;
    const toNumber = body.To;
    if (!accountSid) return null;
    const credential = await this.credentials.findTwilioWebhookCredential(accountSid, toNumber);
    if (!credential) return null;

    if (!verifyTwilioSignature(signature, this.twilioWebhookUrl(webhookType), body, credential.authToken)) {
      throw new ForbiddenException('Twilio webhook signature is invalid');
    }

    return credential.organizationId;
  }

  private twilioWebhookUrl(webhookType: 'status' | 'reply') {
    const baseUrl = this.config.get<string>('dripdesk.publicApiUrl', 'http://localhost:3000').replace(/\/$/, '');
    const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    return `${apiBaseUrl}/webhooks/twilio/${webhookType}`;
  }
}

export function verifyTwilioSignature(
  signature: string | undefined,
  url: string,
  params: Record<string, string | undefined>,
  authToken: string,
) {
  if (!signature || !authToken) return false;
  const signedPayload =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key] ?? ''}`)
      .join('');
  const expected = createHmac('sha1', authToken).update(signedPayload).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number | string;
    };
  };
}

/** Strip email addresses, phone numbers, truncate, and normalize whitespace. */
function sanitizeReplyText(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/\+?\d[\d\s\-().]{6,}\d/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}
