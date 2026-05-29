import { randomBytes } from 'node:crypto';
import { type Channel, type SendMessageJobData } from '@dripdesk/shared';
import {
  createUnsubscribeToken,
  hashUnsubscribeToken,
  prisma,
  type Prisma,
  type PrismaClient,
} from '@dripdesk/database';

export interface PreparedMessage {
  subject?: string;
  body: string;
}

export interface EnrollmentForMessage {
  id: string;
  organizationId: string;
  campaignId: string;
  personId: string;
  person: {
    displayName: string;
    status: string;
    channels: Array<{
      id: string;
      channelType: Channel;
      enabled: boolean;
      unsubscribed: boolean;
      suppressed: boolean;
    }>;
  };
  campaign: {
    id: string;
    name: string;
  };
}

export interface StepForMessage {
  id: string;
  title: string;
  defaultContent: string | null;
  smsContent: string | null;
  telegramContent: string | null;
  emailSubject: string | null;
  emailBody: string | null;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:]+$/;

export async function prepareMessage(
  data: SendMessageJobData,
  publicApiUrl: string,
  publicWebUrl: string,
  client: PrismaClient = prisma,
) {
  const existing = await client.messageOutbox.findFirst({
    where: {
      enrollmentId: data.enrollmentId,
      campaignStepId: data.campaignStepId,
      channelType: data.channel,
    },
  });

  if (existing) return existing;

  const [enrollment, step] = await Promise.all([
    client.enrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        person: { include: { channels: true } },
        campaign: true,
      },
    }),
    client.campaignStep.findUnique({ where: { id: data.campaignStepId } }),
  ]);

  if (!enrollment || !step) {
    throw new Error('Message preparation target not found');
  }

  if ((enrollment as EnrollmentForMessage).person.status !== 'active') {
    throw new Error('Recipient is not active for message preparation');
  }

  const personChannel = (enrollment as EnrollmentForMessage).person.channels.find((channel) => {
    return channel.channelType === data.channel && channel.enabled && !channel.unsubscribed && !channel.suppressed;
  });

  if (!personChannel) {
    throw new Error('No enabled recipient channel found for message');
  }

  const message = selectVariant(step as StepForMessage, data.channel);
  const merged = {
    subject: message.subject ? mergeTags(message.subject, enrollment as EnrollmentForMessage, step as StepForMessage) : undefined,
    body: mergeTags(message.body, enrollment as EnrollmentForMessage, step as StepForMessage),
  };

  return client.$transaction(async (tx) => {
    const outbox = await tx.messageOutbox.create({
      data: {
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        campaignId: enrollment.campaignId,
        campaignStepId: step.id,
        personId: enrollment.personId,
        personChannelId: personChannel.id,
        channelType: data.channel,
        subject: merged.subject,
        body: merged.body,
      },
    });

    const rewritten = await rewriteTrackedLinks({
      body: merged.body,
      publicApiUrl,
      outboxId: outbox.id,
      enrollment: enrollment as EnrollmentForMessage,
      step: step as StepForMessage,
      client: tx,
    });
    const unsubscribe = await createMessageUnsubscribeLink({
      publicWebUrl,
      outboxId: outbox.id,
      enrollment: enrollment as EnrollmentForMessage,
      client: tx,
    });
    const bodyWithUnsubscribe = appendUnsubscribeLink(rewritten, unsubscribe);

    const prepared = await tx.messageOutbox.update({
      where: { id: outbox.id },
      data: { body: bodyWithUnsubscribe },
    });

    await tx.messageEvent.create({
      data: {
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        messageOutboxId: outbox.id,
        eventType: 'prepared',
        metadata: { channel: data.channel },
      },
    });

    return prepared;
  });
}

export function selectVariant(step: StepForMessage, channel: Channel): PreparedMessage {
  if (channel === 'email') {
    const body = step.emailBody || step.defaultContent;
    if (!body) throw new Error('Email message requires body content');
    return { subject: step.emailSubject || step.title, body };
  }

  if (channel === 'sms') {
    const body = step.smsContent || step.defaultContent;
    if (!body) throw new Error('SMS message requires body content');
    return { body };
  }

  const body = step.telegramContent || step.defaultContent;
  if (!body) throw new Error('Telegram message requires body content');
  return { body };
}

export function mergeTags(content: string, enrollment: EnrollmentForMessage, step: StepForMessage) {
  return content
    .replaceAll('{{person.name}}', enrollment.person.displayName)
    .replaceAll('{{campaign.name}}', enrollment.campaign.name)
    .replaceAll('{{step.title}}', step.title);
}

export async function rewriteTrackedLinks(input: {
  body: string;
  publicApiUrl: string;
  outboxId: string;
  enrollment: EnrollmentForMessage;
  step: StepForMessage;
  client: Pick<PrismaClient | Prisma.TransactionClient, 'trackedLink'>;
}) {
  const matches = extractUrls(input.body);
  let rewritten = input.body;

  for (const originalUrl of matches) {
    const token = trackingToken();
    const link = await input.client.trackedLink.create({
      data: {
        organizationId: input.enrollment.organizationId,
        enrollmentId: input.enrollment.id,
        campaignId: input.enrollment.campaignId,
        campaignStepId: input.step.id,
        personId: input.enrollment.personId,
        messageOutboxId: input.outboxId,
        token,
        originalUrl,
      },
    });
    const trackedUrl = `${input.publicApiUrl.replace(/\/$/, '')}/api/l/${link.token}`;
    rewritten = rewritten.split(originalUrl).join(trackedUrl);
  }

  return rewritten;
}

export function extractUrls(content: string) {
  return Array.from(
    new Set((content.match(URL_PATTERN) ?? []).map((url) => url.replace(TRAILING_URL_PUNCTUATION, ''))),
  );
}

function trackingToken() {
  return randomBytes(18).toString('base64url');
}

async function createMessageUnsubscribeLink(input: {
  publicWebUrl: string;
  outboxId: string;
  enrollment: EnrollmentForMessage;
  client: Pick<PrismaClient | Prisma.TransactionClient, 'unsubscribeToken'>;
}) {
  const token = createUnsubscribeToken();
  await input.client.unsubscribeToken.create({
    data: {
      organizationId: input.enrollment.organizationId,
      personId: input.enrollment.personId,
      campaignId: input.enrollment.campaignId,
      enrollmentId: input.enrollment.id,
      messageOutboxId: input.outboxId,
      tokenHash: hashUnsubscribeToken(token),
    },
  });

  return `${input.publicWebUrl.replace(/\/$/, '')}/unsubscribe/${token}`;
}

function appendUnsubscribeLink(body: string, unsubscribeUrl: string) {
  return `${body.trim()}\n\nManage your DripDesk subscription: ${unsubscribeUrl}`;
}
