import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonChannelDto } from './dto/person-channel.dto';
import { UpdatePersonChannelDto } from './dto/update-person-channel.dto';
import { PersonsRepository } from './persons.repository';

@Injectable()
export class PersonsService {
  constructor(private readonly persons: PersonsRepository) {}

  findAll(tenant: TenantContext, page = 1, limit = 50, search?: string) {
    const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
    return this.persons.findManyForTenant(tenant, safePage, safeLimit, search);
  }

  findOne(tenant: TenantContext, id: string) {
    return this.persons.findByIdForTenant(tenant, id);
  }

  async create(tenant: TenantContext, dto: CreatePersonDto) {
    this.validateChannels(dto.channels ?? []);

    try {
      return await this.persons.createForTenant(tenant, this.normalizePerson(dto));
    } catch (error) {
      this.handleUniqueChannelError(error);
      throw error;
    }
  }

  async update(tenant: TenantContext, id: string, dto: UpdatePersonDto) {
    if (dto.channels?.length) {
      throw new BadRequestException('Use person channel endpoints to update channels');
    }

    return this.persons.updateForTenant(tenant, id, this.normalizePerson(dto));
  }

  archive(tenant: TenantContext, id: string) {
    return this.persons.archiveForTenant(tenant, id);
  }

  requestDeletion(tenant: TenantContext, id: string) {
    return this.persons.markDeletionRequestedForTenant(tenant, id);
  }

  async addChannel(tenant: TenantContext, personId: string, dto: PersonChannelDto) {
    this.validateChannels([dto]);

    try {
      return await this.persons.createChannelForTenant(tenant, personId, this.normalizeChannel(dto));
    } catch (error) {
      this.handleUniqueChannelError(error);
      throw error;
    }
  }

  async updateChannel(
    tenant: TenantContext,
    personId: string,
    channelId: string,
    dto: UpdatePersonChannelDto,
  ) {
    const person = await this.persons.findByIdForTenant(tenant, personId);
    const existing = person.channels.find((channel) => channel.id === channelId);
    if (!existing) throw new NotFoundException('Person channel not found');
    const normalized = this.normalizeChannel(dto);
    this.validateChannels([{ channelType: normalized.channelType ?? existing.channelType, address: normalized.address ?? existing.address }]);

    try {
      return await this.persons.updateChannelForTenant(tenant, personId, channelId, normalized);
    } catch (error) {
      this.handleUniqueChannelError(error);
      throw error;
    }
  }

  private normalizePerson<T extends CreatePersonDto | UpdatePersonDto>(dto: T): T {
    return {
      ...dto,
      displayName: dto.displayName?.trim(),
      timezone: dto.timezone?.trim(),
      tags: dto.tags?.map((tag) => tag.trim()).filter(Boolean),
      channels: dto.channels?.map((channel) => this.normalizeChannel(channel)),
    };
  }

  private normalizeChannel<T extends PersonChannelDto | Partial<PersonChannelDto>>(dto: T): T {
    return {
      ...dto,
      address: dto.address?.trim().toLowerCase(),
    };
  }

  private validateChannels(channels: PersonChannelDto[]) {
    for (const channel of channels) {
      const normalized = this.normalizeChannel(channel);

      if (normalized.channelType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.address)) {
        throw new BadRequestException('Email channel address is invalid');
      }

      if (normalized.channelType === 'sms' && !/^\+[1-9]\d{1,14}$/.test(normalized.address)) {
        throw new BadRequestException('SMS channel address must be E.164 format');
      }

      if (normalized.channelType === 'telegram' && !/^[a-z0-9_:@.-]{3,128}$/.test(normalized.address)) {
        throw new BadRequestException('Telegram channel identifier is invalid');
      }
    }
  }

  private handleUniqueChannelError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('This channel already belongs to a person in this organization');
    }
  }
}
