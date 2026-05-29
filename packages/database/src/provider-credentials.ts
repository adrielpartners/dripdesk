import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaClient, type ProviderCredentialType } from '@prisma/client';
import { prisma } from './client';

export type ProviderType = ProviderCredentialType;

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface TelegramConfig {
  botToken: string;
  webhookSecret?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  secure?: boolean;
  preset?: 'brevo' | 'sendgrid' | 'mailgun' | 'generic';
}

export type ProviderConfig = TwilioConfig | TelegramConfig | SmtpConfig;

export class ProviderCredentialStore {
  constructor(
    private readonly client: PrismaClient = prisma,
    private readonly encryptionKey: string = process.env.DRIPDESK_ENCRYPTION_KEY ?? '',
  ) {}

  listMasked(organizationId: string) {
    return this.client.providerCredential.findMany({
      where: { organizationId },
      select: {
        id: true,
        providerType: true,
        maskedConfig: true,
        status: true,
        lastTestedAt: true,
        lastError: true,
        updatedAt: true,
      },
      orderBy: { providerType: 'asc' },
    });
  }

  async upsert(organizationId: string, providerType: ProviderType, config: ProviderConfig) {
    const validation = validateProviderConfig(providerType, config);
    if (!validation.ok) throw new Error(validation.error);

    const encryptedConfig = encryptJson(config, this.encryptionKey);
    const maskedConfig = maskProviderConfig(providerType, config);
    const twilioAccountSid = providerType === 'twilio' ? (config as TwilioConfig).accountSid : null;

    return this.client.providerCredential.upsert({
      where: {
        organizationId_providerType: {
          organizationId,
          providerType,
        },
      },
      create: {
        organizationId,
        providerType,
        encryptedConfig,
        maskedConfig,
        twilioAccountSid,
        status: 'configured',
        lastError: null,
      },
      update: {
        encryptedConfig,
        maskedConfig,
        twilioAccountSid,
        status: 'configured',
        lastError: null,
      },
      select: {
        id: true,
        providerType: true,
        maskedConfig: true,
        status: true,
        lastTestedAt: true,
        lastError: true,
        updatedAt: true,
      },
    });
  }

  async getConfig<T extends ProviderConfig>(organizationId: string, providerType: ProviderType): Promise<T | null> {
    const credential = await this.client.providerCredential.findUnique({
      where: {
        organizationId_providerType: {
          organizationId,
          providerType,
        },
      },
    });

    if (!credential) return null;
    return decryptJson<T>(credential.encryptedConfig, this.encryptionKey);
  }

  async findTwilioOrganization(accountSid: string, toNumber?: string): Promise<string | null> {
    const credential = await this.findTwilioWebhookCredential(accountSid, toNumber);
    return credential?.organizationId ?? null;
  }

  async findTwilioWebhookCredential(
    accountSid: string,
    toNumber?: string,
  ): Promise<{ organizationId: string; authToken: string } | null> {
    const credential = await this.client.providerCredential.findFirst({
      where: {
        providerType: 'twilio',
        twilioAccountSid: accountSid,
      },
      select: {
        organizationId: true,
        encryptedConfig: true,
      },
    });

    if (!credential) return null;

    let config: TwilioConfig;
    try {
      config = decryptJson<TwilioConfig>(credential.encryptedConfig, this.encryptionKey);
    } catch {
      return null;
    }

    if (toNumber && config.fromNumber !== toNumber) return null;
    return { organizationId: credential.organizationId, authToken: config.authToken };
  }

  async markTested(organizationId: string, providerType: ProviderType, ok: boolean, error?: string) {
    return this.client.providerCredential.update({
      where: {
        organizationId_providerType: {
          organizationId,
          providerType,
        },
      },
      data: {
        status: ok ? 'verified' : 'failed',
        lastTestedAt: new Date(),
        lastError: ok ? null : normalizeProviderError(error),
      },
      select: {
        id: true,
        providerType: true,
        maskedConfig: true,
        status: true,
        lastTestedAt: true,
        lastError: true,
        updatedAt: true,
      },
    });
  }
}

export function validateProviderConfig(providerType: ProviderType, config: ProviderConfig) {
  if (providerType === 'twilio') {
    const value = config as TwilioConfig;
    if (!value.accountSid || !value.authToken || !value.fromNumber) {
      return { ok: false, error: 'Twilio account SID, auth token, and from number are required' };
    }
    return { ok: true };
  }

  if (providerType === 'telegram') {
    const value = config as TelegramConfig;
    if (!value.botToken) return { ok: false, error: 'Telegram bot token is required' };
    return { ok: true };
  }

  const value = config as SmtpConfig;
  if (!value.host || !value.port || !value.fromEmail) {
    return { ok: false, error: 'SMTP host, port, and from email are required' };
  }
  return { ok: true };
}

export function maskProviderConfig(providerType: ProviderType, config: ProviderConfig) {
  if (providerType === 'twilio') {
    const value = config as TwilioConfig;
    return {
      accountSid: maskMiddle(value.accountSid),
      authToken: '********',
      fromNumber: value.fromNumber,
    };
  }

  if (providerType === 'telegram') {
    const value = config as TelegramConfig;
    return {
      botToken: maskMiddle(value.botToken),
      webhookSecret: value.webhookSecret ? '********' : '',
    };
  }

  const value = config as SmtpConfig;
  return {
    host: value.host,
    port: value.port,
    username: value.username ? maskMiddle(value.username) : '',
    password: value.password ? '********' : '',
    fromEmail: value.fromEmail,
    fromName: value.fromName ?? '',
    secure: Boolean(value.secure),
    preset: value.preset ?? 'generic',
  };
}

export function normalizeProviderError(error?: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? 'Provider request failed');
  if (/auth|credential|unauthorized|forbidden|invalid key|token/i.test(message)) return 'Provider credentials were rejected';
  if (/rate|too many/i.test(message)) return 'Provider rate limit reached';
  if (/timeout|network|econn/i.test(message)) return 'Provider network request failed';
  return 'Provider request failed';
}

export function verifySharedSecret(provided: string | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function encryptJson(value: unknown, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decryptJson<T>(value: string, secret: string): T {
  const [ivRaw, tagRaw, ciphertextRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new Error('Provider credentials are not readable');

  const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(secret), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as T;
}

function keyFromSecret(secret: string) {
  return createHash('sha256').update(secret).digest();
}

function maskMiddle(value: string) {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
