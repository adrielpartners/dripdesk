import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getEnrollmentByToken(accessToken: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { accessToken },
      include: {
        person: { select: { firstName: true, lastName: true, email: true, preferredChannels: true } },
        campaign: {
          select: { name: true, description: true, channelsEnabled: true },
        },
        stepStates: {
          include: { step: { select: { id: true, name: true, order: true, externalLinkUrl: true } } },
          orderBy: { step: { order: 'asc' } },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async getLessons(accessToken: string) {
    const enrollment = await this.getEnrollmentByToken(accessToken);
    return enrollment.stepStates.map((ss) => ({
      stepId: ss.stepId,
      name: ss.step.name,
      order: ss.step.order,
      status: ss.status,
      completedAt: ss.completedAt,
      externalLinkUrl: ss.step.externalLinkUrl,
    }));
  }

  async unsubscribe(accessToken: string, campaignId?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { accessToken } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (campaignId) {
      await this.prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: 'DROPPED' } });
      await this.prisma.unsubscribeEvent.create({ data: { personId: enrollment.personId, campaignId } });
    } else {
      await this.prisma.person.update({
        where: { id: enrollment.personId },
        data: { globallyUnsubscribed: true, globallyUnsubscribedAt: new Date() },
      });
      await this.prisma.unsubscribeEvent.create({ data: { personId: enrollment.personId } });
    }

    return { message: 'Unsubscribed successfully' };
  }
}
