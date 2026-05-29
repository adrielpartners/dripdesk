import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ProviderCredentialStore,
  type ProviderConfig,
  type ProviderType,
  validateProviderConfig,
} from '@dripdesk/database';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertProviderCredentialDto } from './dto/upsert-provider-credential.dto';

@Injectable()
export class ProviderCredentialsService {
  private readonly store: ProviderCredentialStore;

  constructor(private readonly prisma: PrismaService) {
    this.store = new ProviderCredentialStore(prisma);
  }

  list(tenant: TenantContext) {
    return this.store.listMasked(tenant.organizationId);
  }

  async upsert(tenant: TenantContext, dto: UpsertProviderCredentialDto) {
    const config = dtoToProviderConfig(dto);
    const validation = validateProviderConfig(dto.providerType, config);
    if (!validation.ok) throw new BadRequestException(validation.error);
    return this.store.upsert(tenant.organizationId, dto.providerType, config);
  }

  async test(tenant: TenantContext, providerType: ProviderType) {
    const config = await this.store.getConfig(tenant.organizationId, providerType);
    if (!config) throw new BadRequestException('Provider credentials are not configured');

    const validation = validateProviderConfig(providerType, config);
    const tested = await this.store.markTested(
      tenant.organizationId,
      providerType,
      validation.ok,
      validation.ok ? undefined : validation.error,
    );

    if (!validation.ok) throw new BadRequestException(validation.error);
    return tested;
  }
}

function dtoToProviderConfig(dto: UpsertProviderCredentialDto): ProviderConfig {
  if (dto.providerType === 'twilio') {
    return {
      accountSid: dto.accountSid ?? '',
      authToken: dto.authToken ?? '',
      fromNumber: dto.fromNumber ?? '',
    };
  }

  if (dto.providerType === 'telegram') {
    return {
      botToken: dto.botToken ?? '',
      webhookSecret: dto.webhookSecret || undefined,
    };
  }

  return {
    host: dto.host ?? '',
    port: dto.port ?? 587,
    username: dto.username || undefined,
    password: dto.password || undefined,
    fromEmail: dto.fromEmail ?? '',
    fromName: dto.fromName || undefined,
    secure: Boolean(dto.secure),
    preset: dto.preset ?? 'generic',
  };
}
