import net from 'node:net';
import tls from 'node:tls';
import {
  normalizeProviderError,
  ProviderCredentialStore,
  prisma,
  type SmtpConfig,
  type TelegramConfig,
  type TwilioConfig,
} from '@dripdesk/database';

interface SendProviderMessageInput {
  outboxId: string;
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

    throw new Error(safeError);
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
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const result = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!response.ok) throw new Error(result.message ?? 'Twilio send failed');

  return { provider: 'twilio', providerMessageId: result.sid };
}

async function sendTelegram(config: TelegramConfig, recipient: string, body: string) {
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: recipient,
      text: body,
      disable_web_page_preview: false,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number };
  };
  if (!response.ok || !result.ok) throw new Error(result.description ?? 'Telegram send failed');

  return { provider: 'telegram', providerMessageId: result.result?.message_id?.toString() };
}

async function sendEmail(config: SmtpConfig, recipient: string, subject: string | null, body: string) {
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@dripdesk.local>`;
  const smtp = await connectSmtp(config);

  try {
    await smtp.expect([220]);
    await smtp.command(`EHLO dripdesk.local`, [250]);
    if (config.username || config.password) {
      await smtp.command('AUTH LOGIN', [334]);
      await smtp.command(Buffer.from(config.username ?? '').toString('base64'), [334]);
      await smtp.command(Buffer.from(config.password ?? '').toString('base64'), [235]);
    }
    await smtp.command(`MAIL FROM:<${config.fromEmail}>`, [250]);
    await smtp.command(`RCPT TO:<${recipient}>`, [250, 251]);
    await smtp.command('DATA', [354]);
    await smtp.command(
      [
        `From: ${config.fromName ?? 'DripDesk'} <${config.fromEmail}>`,
        `To: <${recipient}>`,
        `Subject: ${subject ?? 'New message'}`,
        `Message-ID: ${messageId}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        body.replace(/\r?\n/g, '\r\n'),
        '.',
      ].join('\r\n'),
      [250],
    );
    return { provider: 'smtp', providerMessageId: messageId };
  } finally {
    smtp.close();
  }
}

async function connectSmtp(config: SmtpConfig) {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });

  socket.setEncoding('utf8');
  let buffer = '';
  const responses: string[] = [];
  let pending: { resolve: () => void; reject: (error: Error) => void; expected: number[]; timeout: NodeJS.Timeout } | null = null;

  function acceptResponse(line: string, expected: number[]) {
    const code = Number(line.slice(0, 3));
    if (expected.includes(code)) return;
    throw new Error(`SMTP provider rejected request with ${code}`);
  }

  socket.on('data', (chunk) => {
    buffer += chunk;
    let end = buffer.indexOf('\n');
    while (end !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, '');
      buffer = buffer.slice(end + 1);
      // Multiline SMTP responses end with "250 ", not "250-".
      if (/^\d{3} /.test(line)) {
        if (pending) {
          const waiter = pending;
          pending = null;
          clearTimeout(waiter.timeout);
          try {
            acceptResponse(line, waiter.expected);
            waiter.resolve();
          } catch (error) {
            waiter.reject(error as Error);
          }
        } else {
          responses.push(line);
        }
      }
      end = buffer.indexOf('\n');
    }
  });

  function rejectPending(error: Error) {
    if (!pending) return;
    const waiter = pending;
    pending = null;
    clearTimeout(waiter.timeout);
    waiter.reject(error);
  }

  socket.on('error', rejectPending);
  socket.on('close', () => rejectPending(new Error('SMTP connection closed')));

  return {
    async command(command: string, expected: number[]) {
      socket.write(`${command}\r\n`);
      return this.expect(expected);
    },
    expect(expected: number[]) {
      const response = responses.shift();
      if (response) {
        try {
          acceptResponse(response, expected);
          return Promise.resolve();
        } catch (error) {
          return Promise.reject(error);
        }
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          rejectPending(new Error('SMTP provider timed out'));
        }, 10000);
        pending = { resolve, reject, expected, timeout };
      });
    },
    close() {
      socket.end();
    },
  };
}
