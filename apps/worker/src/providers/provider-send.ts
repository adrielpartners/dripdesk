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
  if (
    outbox.person.status !== 'active' ||
    !outbox.personChannel.enabled ||
    outbox.personChannel.unsubscribed ||
    outbox.personChannel.suppressed
  ) {
    throw new Error('Recipient is not eligible for provider send');
  }

  await prisma.messageOutbox.update({
    where: { id: outbox.id },
    data: { status: 'sending' },
  });

  try {
    const result = await sendByChannel(outbox);
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
    await smtp.command('QUIT', [221]);
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
  socket.on('data', (chunk) => {
    buffer += chunk;
  });

  return {
    async command(command: string, expected: number[]) {
      socket.write(`${command}\r\n`);
      return this.expect(expected);
    },
    expect(expected: number[]) {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('SMTP provider timed out'));
        }, 10000);

        const onData = () => {
          const line = lastCompleteLine(buffer);
          if (!line) return;
          const code = Number(line.slice(0, 3));
          if (!Number.isFinite(code)) return;
          cleanup();
          if (expected.includes(code)) resolve();
          else reject(new Error(`SMTP provider rejected request with ${code}`));
        };

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        function cleanup() {
          clearTimeout(timeout);
          socket.off('data', onData);
          socket.off('error', onError);
        }

        socket.on('data', onData);
        socket.on('error', onError);
        onData();
      });
    },
    close() {
      socket.end();
    },
  };
}

function lastCompleteLine(buffer: string) {
  const lines = buffer.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (/^\d{3} /.test(line)) return line;
  }
  return undefined;
}
