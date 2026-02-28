import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        organizationId: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByOrganization(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        organizationId: true,
      },
    });
  }

  async inviteToOrganization(email: string, orgId: string, role = 'MEMBER') {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { organizationId: orgId, role: role as any },
      });
    }

    return this.prisma.user.create({
      data: {
        email,
        role: role as any,
        organizationId: orgId,
      },
    });
  }
}
