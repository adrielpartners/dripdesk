import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonChannelDto } from './dto/person-channel.dto';

@Injectable()
export class PersonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyForTenant(tenant: TenantContext, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.PersonWhereInput = {
      organizationId: tenant.organizationId,
      status: { not: 'archived' },
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { channels: { some: { address: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        include: { channels: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.person.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdForTenant(tenant: TenantContext, id: string) {
    const person = await this.prisma.person.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
        status: { not: 'archived' },
      },
      include: { channels: { orderBy: { createdAt: 'asc' } } },
    });

    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  createForTenant(tenant: TenantContext, dto: CreatePersonDto) {
    return this.prisma.person.create({
      data: {
        organizationId: tenant.organizationId,
        displayName: dto.displayName,
        timezone: dto.timezone,
        tags: dto.tags ?? [],
        channels: dto.channels?.length
          ? {
              create: dto.channels.map((channel) => ({
                organizationId: tenant.organizationId,
                channelType: channel.channelType,
                address: channel.address,
                enabled: channel.enabled ?? true,
              })),
            }
          : undefined,
      },
      include: { channels: true },
    });
  }

  async updateForTenant(tenant: TenantContext, id: string, dto: UpdatePersonDto) {
    await this.findByIdForTenant(tenant, id);

    return this.prisma.person.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        timezone: dto.timezone,
        tags: dto.tags,
      },
      include: { channels: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async archiveForTenant(tenant: TenantContext, id: string) {
    await this.findByIdForTenant(tenant, id);

    return this.prisma.person.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });
  }

  async markDeletionRequestedForTenant(tenant: TenantContext, id: string) {
    await this.findByIdForTenant(tenant, id);

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.update({
        where: { id },
        data: {
          status: 'deletion_requested',
          deletionRequestedAt: now,
        },
        include: { channels: true },
      });

      await tx.personChannel.updateMany({
        where: { personId: id, organizationId: tenant.organizationId },
        data: { enabled: false, unsubscribed: true, suppressed: true },
      });
      await tx.enrollment.updateMany({
        where: { personId: id, organizationId: tenant.organizationId, status: 'active' },
        data: { status: 'removed', removedAt: now },
      });

      return person;
    });
  }

  async createChannelForTenant(tenant: TenantContext, personId: string, dto: PersonChannelDto) {
    await this.findByIdForTenant(tenant, personId);

    return this.prisma.personChannel.create({
      data: {
        organizationId: tenant.organizationId,
        personId,
        channelType: dto.channelType,
        address: dto.address,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updateChannelForTenant(
    tenant: TenantContext,
    personId: string,
    channelId: string,
    dto: Partial<PersonChannelDto>,
  ) {
    await this.findByIdForTenant(tenant, personId);

    const channel = await this.prisma.personChannel.findFirst({
      where: {
        id: channelId,
        personId,
        organizationId: tenant.organizationId,
      },
    });

    if (!channel) throw new NotFoundException('Person channel not found');

    return this.prisma.personChannel.update({
      where: { id: channelId },
      data: {
        channelType: dto.channelType,
        address: dto.address,
        enabled: dto.enabled,
      },
    });
  }
}
