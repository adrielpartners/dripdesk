import nodemailer from 'nodemailer';
import {
  formatProviderDiagnostic,
  normalizeProviderError,
  ProviderCredentialStore,
  prisma,
  sanitizeProviderDetail,
  type ProviderDiagnostic,
  type SmtpConfig,
  type TelegramConfig,
  type TwilioConfig,
} from '@dripdesk/database';
import type { TestProviderJobData } from '@dripdesk/shared';

interface SendProviderMessageInput {
  outboxId: string;
}

class ProviderRequestError extends Error {
  constructor(readonly diagnostic: ProviderDiagnostic, cause?: unknown) {
    super(formatProviderDiagnostic(diagnostic), { cause });
  }
}

function diagnosticFromError(provider: ProviderDiagnostic['provider'], stage: string, error: unknown, secrets: string[] = []): ProviderDiagnostic {
  if (error instanceof ProviderRequestError) return error.diagnostic;
  const smtpError = error && typeof error === 'object' ? error as { responseCode?: unknown; response?: unknown; command?: unknown } : null;
  if (provider === 'smtp' && typeof smtpError?.responseCode === 'number') {
    const reply = typeof smtpError.response === 'string' ? smtpError.response : '';
    const enhancedCode = reply.match(/\b[245]\.\d{1,3}\.\d{1,3}\b/)?.[0];
    return {
      provider,
      stage: typeof smtpError.command === 'string' ? smtpError.command : stage,
      code: `SMTP_${smtpError.responseCode}`,
      providerCode: enhancedCode,
      detail: sanitizeProviderDetail(reply.replace(/^\d{3}[- ]?/, '') || 'SMTP provider rejected the message.', secrets),
    };
  }

  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined;
  const candidate = cause && typeof cause === 'object' && 'code' in cause ? cause.code
    : error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const code = typeof candidate === 'string' && /^[A-Z0-9_]{2,50}$/.test(candidate) ? candidate : undefined;
  const descriptions: Record<string, string> = {
    EAI_AGAIN: 'Temporary DNS lookup failure. Check outbound network access and DNS.',
    ENOTFOUND: 'Provider hostname could not be resolved.',
    ECONNREFUSED: 'Provider refused the connection.',
    ETIMEDOUT: 'Connection to provider timed out.',
    ECONNRESET: 'Provider closed the connection unexpectedly.',
    CERT_HAS_EXPIRED: 'Provider TLS certificate has expired.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Provider TLS certificate could not be verified.',
  };
  return {
    provider,
    stage,
    code,
    detail: code ? descriptions[code] ?? 'Network or TLS request failed.' : 'Provider request failed before a usable response was received.',
  };
}

interface OutboxForSend {
  id: string;
  organizationId: string;
  enrollmentId: string;
  campaignStepId: string;
  personId: string;
  personChannelId: string;
  channelType: 'sms' | 'telegram' | 'email';
  status: string;
  subject: string | null;
  body: string;
  personChannel: {
    address: string;
    enabled: boolean;
    unsubscribed: boolean;
    suppressed: boolean;
  };
  person: {
    status: string;
  };
}

export async function sendProviderMessage(input: SendProviderMessageInput) {
  const outbox = (await prisma.messageOutbox.findUnique({
    where: { id: input.outboxId },
    include: { personChannel: true, person: true },
  })) as OutboxForSend | null;

  if (!outbox) throw new Error('Message outbox record not found');
  if (outbox.status === 'sent') return { sent: true, outboxId: outbox.id, alreadySent: true };
  if (outbox.status === 'sending') {
    return { sent: false, outboxId: outbox.id, deliveryUncertain: true };
  }
  if (
    outbox.person.status !== 'active' ||
    !outbox.personChannel.enabled ||
    outbox.personChannel.unsubscribed ||
    outbox.personChannel.suppressed
  ) {
    throw new Error('Recipient is not eligible for provider send');
  }

  const claim = await prisma.messageOutbox.updateMany({
    where: { id: outbox.id, status: { in: ['prepared', 'failed'] } },
    data: { status: 'sending' },
  });
  if (claim.count !== 1) {
    return { sent: false, outboxId: outbox.id, deliveryUncertain: true };
  }

  let result: Awaited<ReturnType<typeof sendByChannel>>;
  try {
    result = await sendByChannel(outbox);
  } catch (error) {
    const failedAt = new Date();
    const safeError = normalizeProviderError(error);

    await prisma.$transaction([
      prisma.messageOutbox.update({
        where: { id: outbox.id },
        data: {
          status: 'failed',
          failedAt,
          errorMessage: safeError,
        },
      }),
      prisma.messageEvent.create({
        data: {
          organizationId: outbox.organizationId,
          enrollmentId: outbox.enrollmentId,
          messageOutboxId: outbox.id,
          eventType: 'failed',
          occurredAt: failedAt,
          metadata: {
            provider: outbox.channelType,
            error: safeError,
          },
        },
      }),
    ]);

    throw new Error(safeError, { cause: error });
  }

  // Provider acceptance and DB persistence cannot be atomic. If persistence fails,
  // leave the outbox as "sending" for inspection instead of risking a duplicate send.
  const sentAt = new Date();
  await prisma.$transaction([
    prisma.messageOutbox.update({
      where: { id: outbox.id },
      data: {
        status: 'sent',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        sentAt,
        errorMessage: null,
      },
    }),
    prisma.messageEvent.create({
      data: {
        organizationId: outbox.organizationId,
        enrollmentId: outbox.enrollmentId,
        messageOutboxId: outbox.id,
        eventType: 'sent',
        occurredAt: sentAt,
        metadata: {
          provider: result.provider,
          providerMessageId: result.providerMessageId,
        },
      },
    }),
    prisma.enrollmentStepState.updateMany({
      where: {
        enrollmentId: outbox.enrollmentId,
        campaignStepId: outbox.campaignStepId,
        status: { in: ['queued', 'pending'] },
      },
      data: {
        status: 'sent',
        sentAt,
      },
    }),
  ]);

  return { sent: true, outboxId: outbox.id, provider: result.provider };
}

export async function sendProviderTest(input: TestProviderJobData) {
  const credentials = new ProviderCredentialStore();
  try {
    if (input.providerType === 'twilio') {
      const config = await credentials.getConfig<TwilioConfig>(input.organizationId, 'twilio');
      if (!config) throw new Error('Twilio credentials not configured');
      await sendSms(config, input.recipient, 'DripDesk test message. Your SMS integration is working.');
    } else if (input.providerType === 'telegram') {
      const config = await credentials.getConfig<TelegramConfig>(input.organizationId, 'telegram');
      if (!config) throw new Error('Telegram credentials not configured');
      await sendTelegram(config, input.recipient, 'DripDesk test message. Your Telegram integration is working.');
    } else {
      const config = await credentials.getConfig<SmtpConfig>(input.organizationId, 'smtp');
      if (!config) throw new Error('SMTP credentials not configured');
      await sendEmail(config, input.recipient, 'DripDesk email integration test', 'Your DripDesk email integration is working.');
    }
    await credentials.markTested(input.organizationId, input.providerType, true);
    return { sent: true };
  } catch (error) {
    const diagnostic = diagnosticFromError(input.providerType, 'configuration or connection', error);
    await credentials.markTested(input.organizationId, input.providerType, false, diagnostic);
    throw new Error(JSON.stringify({ tag: 'dripdesk-provider-test', diagnostic }), { cause: error });
  }
}

async function sendByChannel(outbox: OutboxForSend) {
  const credentials = new ProviderCredentialStore();

  if (outbox.channelType === 'sms') {
    const config = await credentials.getConfig<TwilioConfig>(outbox.organizationId, 'twilio');
    if (!config) throw new Error('Twilio credentials not configured');
    return sendSms(config, outbox.personChannel.address, outbox.body);
  }

  if (outbox.channelType === 'telegram') {
    const config = await credentials.getConfig<TelegramConfig>(outbox.organizationId, 'telegram');
    if (!config) throw new Error('Telegram credentials not configured');
    return sendTelegram(config, outbox.personChannel.address, outbox.body);
  }

  const config = await credentials.getConfig<SmtpConfig>(outbox.organizationId, 'smtp');
  if (!config) throw new Error('SMTP credentials not configured');
  return sendEmail(config, outbox.personChannel.address, outbox.subject, outbox.body);
}

async function sendSms(config: TwilioConfig, recipient: string, body: string) {
  const params = new URLSearchParams({
    From: config.fromNumber,
    To: recipient,
    Body: body,
  });
  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
  } catch (error) {
    throw new ProviderRequestError(diagnosticFromError('twilio', 'HTTP connection', error));
  }

  const result = (await response.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
  if (!response.ok) {
    throw new ProviderRequestError({
      provider: 'twilio',
      stage: 'send message',
      httpStatus: response.status,
      providerCode: Number.isInteger(result.code) ? String(result.code) : undefined,
      detail: result.message ? sanitizeProviderDetail(result.message, [config.authToken, config.accountSid]) : 'Twilio rejected the request.',
    });
  }

  return { provider: 'twilio', providerMessageId: result.sid };
}

async function sendTelegram(config: TelegramConfig, recipient: string, body: string) {
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: recipient,
        text: body,
        disable_web_page_preview: false,
      }),
    });
  } catch (error) {
    throw new ProviderRequestError(diagnosticFromError('telegram', 'HTTP connection', error));
  }

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    error_code?: number;
    parameters?: { retry_after?: number };
    result?: { message_id?: number };
  };
  if (!response.ok || !result.ok) {
    const retry = result.parameters?.retry_after;
    throw new ProviderRequestError({
      provider: 'telegram',
      stage: 'send message',
      httpStatus: response.status,
      providerCode: Number.isInteger(result.error_code) ? String(result.error_code) : undefined,
      detail: `${sanitizeProviderDetail(result.description ?? 'Telegram rejected the request.', [config.botToken])}${Number.isInteger(retry) ? ` Retry after ${retry} seconds.` : ''}`,
    });
  }

  return { provider: 'telegram', providerMessageId: result.result?.message_id?.toString() };
}

export async function sendEmail(config: SmtpConfig, recipient: string, subject: string | null, body: string) {
  if ([config.fromEmail, config.fromName, recipient, subject].some((value) => value && /[\r\n]/.test(value))) {
    throw new Error('Email address and header fields must be single-line values');
  }
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure && (config.port === 587 || Boolean(config.username || config.password)),
    auth: config.username || config.password ? { user: config.username ?? '', pass: config.password ?? '' } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  try {
    const result = await transport.sendMail({
      from: { name: config.fromName ?? 'DripDesk', address: config.fromEmail },
      to: { address: recipient, name: '' },
      subject: subject ?? 'New message',
      text: body,
    });
    return { provider: 'smtp', providerMessageId: result.messageId };
  } catch (error) {
    throw new ProviderRequestError(diagnosticFromError('smtp', 'send message', error, [config.password ?? '', config.username ?? '']), error);
  } finally {
    transport.close();
  }
}
