import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { ImportPersonsDto } from './dto/import-persons.dto';

@Injectable()
export class PersonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.person.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        channels: true,
        enrollments: {
          include: { campaign: { select: { name: true, status: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  async create(orgId: string, dto: CreatePersonDto) {
    if (dto.email) {
      const existing = await this.prisma.person.findUnique({
        where: { organizationId_email: { organizationId: orgId, email: dto.email } },
      });
      if (existing && !existing.deletedAt) {
        throw new ConflictException('Person with this email already exists');
      }
    }

    const { tagIds, ...personData } = dto;

    const person = await this.prisma.person.create({
      data: {
        organizationId: orgId,
        ...personData,
        ...(tagIds?.length && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
        channels: {
          create: this.buildChannels(dto),
        },
      },
      include: { tags: { include: { tag: true } }, channels: true },
    });

    return person;
  }

  async update(id: string, orgId: string, dto: Partial<CreatePersonDto>) {
    const person = await this.prisma.person.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });

    if (!person) throw new NotFoundException('Person not found');

    const { tagIds, ...updateData } = dto;

    return this.prisma.person.update({
      where: { id },
      data: updateData,
      include: { tags: { include: { tag: true } }, channels: true },
    });
  }

  async remove(id: string, orgId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });

    if (!person) throw new NotFoundException('Person not found');

    return this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async importPersons(orgId: string, dto: ImportPersonsDto) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const personDto of dto.persons) {
      try {
        await this.create(orgId, personDto);
        results.created++;
      } catch (error) {
        if (error instanceof ConflictException) {
          results.skipped++;
        } else {
          results.errors.push(`${personDto.email ?? personDto.phone}: ${error.message}`);
        }
      }
    }

    return results;
  }

  async requestDeletion(id: string, orgId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });

    if (!person) throw new NotFoundException('Person not found');

    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30);

    await this.prisma.deletionRequest.upsert({
      where: { personId: id },
      update: { status: 'PENDING', scheduledFor },
      create: { personId: id, scheduledFor },
    });

    return { message: 'Deletion request scheduled for 30 days from now' };
  }

  private buildChannels(dto: CreatePersonDto) {
    const channels: { channel: string; identifier: string }[] = [];

    if (dto.email) channels.push({ channel: 'EMAIL', identifier: dto.email });
    if (dto.phone) channels.push({ channel: 'SMS', identifier: dto.phone });
    if (dto.telegramId) channels.push({ channel: 'TELEGRAM', identifier: dto.telegramId });
    if (dto.whatsappId) channels.push({ channel: 'WHATSAPP', identifier: dto.whatsappId });

    return channels;
  }
}
