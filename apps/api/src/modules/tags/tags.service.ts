import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { persons: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(orgId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        color: dto.color ?? '#10B981',
      },
    });
  }

  async remove(id: string, orgId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.tag.delete({ where: { id } });
  }

  async addToPersons(tagId: string, personIds: string[], orgId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, organizationId: orgId },
    });

    if (!tag) throw new NotFoundException('Tag not found');

    await Promise.all(
      personIds.map((personId) =>
        this.prisma.personTag.upsert({
          where: { personId_tagId: { personId, tagId } },
          update: {},
          create: { personId, tagId },
        }),
      ),
    );

    return { message: `Tag applied to ${personIds.length} persons` };
  }

  async removeFromPerson(tagId: string, personId: string, orgId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, organizationId: orgId },
    });

    if (!tag) throw new NotFoundException('Tag not found');

    await this.prisma.personTag.delete({
      where: { personId_tagId: { personId, tagId } },
    });

    return { message: 'Tag removed from person' };
  }
}
