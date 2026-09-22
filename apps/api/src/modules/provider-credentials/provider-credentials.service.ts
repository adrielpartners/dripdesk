import { BadRequestException, Injectable } from '@nestjs/common';
import { isValidEmail, isValidPhone } from '@dripdesk/shared';
import {
  ProviderCredentialStore,
  type ProviderConfig,
  type ProviderType,
  validateProviderConfig,
} from '@dripdesk/database';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { UpsertProviderCredentialDto } from './dto/upsert-provider-credential.dto';

@Injectable()
export class ProviderCredentialsService {
  private readonly store: ProviderCredentialStore;

  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService) {
    this.store = new ProviderCredentialStore(prisma);
  }

  list(tenant: TenantContext) {
    return this.store.listMasked(tenant.organizationId);
  }

  async upsert(tenant: TenantContext, dto: UpsertProviderCredentialDto) {
    assertProviderType(dto.providerType);
    const existing = await this.store.getConfig(tenant.organizationId, dto.providerType);
    const config = dtoToProviderConfig(dto, existing);
    const validation = validateProviderConfig(dto.providerType, config);
    if (!validation.ok) throw new BadRequestException(validation.error);
    return this.store.upsert(tenant.organizationId, dto.providerType, config);
  }

  async test(tenant: TenantContext, providerType: ProviderType, recipient: string) {
    assertTestRecipient(providerType, recipient);
    const config = await this.store.getConfig(tenant.organizationId, providerType);
    if (!config) throw new BadRequestException('Provider credentials are not configured');

    const validation = validateProviderConfig(providerType, config);
    if (!validation.ok) throw new BadRequestException(validation.error);
    return this.queue.enqueueProviderTest(tenant.organizationId, providerType, recipient.trim());
  }

  testStatus(tenant: TenantContext, providerType: ProviderType, jobId: string) {
    assertProviderType(providerType);
    return this.queue.getProviderTestStatus(tenant.organizationId, providerType, jobId);
  }
}

function assertProviderType(providerType: string): asserts providerType is ProviderType {
  if (!['twilio', 'telegram', 'smtp'].includes(providerType)) {
    throw new BadRequestException('Unknown provider');
  }
}

function assertTestRecipient(providerType: ProviderType, recipient: string) {
  assertProviderType(providerType);
  const value = recipient.trim();
  if (providerType === 'smtp' && !isValidEmail(value)) {
    throw new BadRequestException('Enter a valid test email address');
  }
  if (providerType === 'twilio' && (!isValidPhone(value) || !/^\+[1-9]\d{6,14}$/.test(value))) {
    throw new BadRequestException('Enter a test phone number in international format, such as +15551234567');
  }
  if (providerType === 'telegram' && !/^-?\d{1,20}$/.test(value)) {
    throw new BadRequestException('Enter a numeric Telegram chat ID');
  }
}

function dtoToProviderConfig(dto: UpsertProviderCredentialDto, existing: ProviderConfig | null): ProviderConfig {
  if (dto.providerType === 'twilio') {
    const previous = existing as Extract<ProviderConfig, { accountSid: string }> | null;
    return {
      accountSid: dto.accountSid?.trim() || previous?.accountSid || '',
      authToken: dto.authToken || previous?.authToken || '',
      fromNumber: dto.fromNumber?.trim() || previous?.fromNumber || '',
    };
  }

  if (dto.providerType === 'telegram') {
    const previous = existing as Extract<ProviderConfig, { botToken: string }> | null;
    return {
      botToken: dto.botToken || previous?.botToken || '',
      webhookSecret: dto.webhookSecret || previous?.webhookSecret || undefined,
    };
  }

  const previous = existing as Extract<ProviderConfig, { host: string }> | null;
  return {
    host: dto.host?.trim() || previous?.host || '',
    port: dto.port ?? previous?.port ?? 587,
    username: dto.username || previous?.username || undefined,
    password: dto.password || previous?.password || undefined,
    fromEmail: dto.fromEmail?.trim() || previous?.fromEmail || '',
    fromName: dto.fromName === undefined ? previous?.fromName : dto.fromName || undefined,
    secure: dto.secure ?? previous?.secure ?? false,
    preset: dto.preset ?? previous?.preset ?? 'generic',
  };
}
