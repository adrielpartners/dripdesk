import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async createTrackedLink(campaignId: string, stepId: string | null, originalUrl: string) {
    const linkToken = nanoid(8);
    return this.prisma.trackedLink.create({
      data: { campaignId, stepId, originalUrl, linkToken },
    });
  }

  async handleLinkClick(
    linkToken: string,
    enrollmentId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const link = await this.prisma.trackedLink.findUnique({ where: { linkToken } });
    if (!link) throw new NotFoundException('Link not found');

    await this.prisma.trackedLinkClick.create({
      data: {
        linkId: link.id,
        enrollmentId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    await this.prisma.trackedLink.update({
      where: { id: link.id },
      data: {
        totalClicks: { increment: 1 },
        uniqueClicks: enrollmentId ? { increment: 1 } : undefined,
      },
    });

    if (enrollmentId && link.stepId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { campaign: true },
      });

      if (enrollment?.campaign.completionMode === 'LINK_CLICK') {
        await this.prisma.enrollmentStepState.updateMany({
          where: { enrollmentId, stepId: link.stepId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completionMethod: 'LINK_CLICK',
            firstClickedAt: new Date(),
            clickedCount: { increment: 1 },
          },
        });
      }

      await this.prisma.enrollmentStepState.updateMany({
        where: { enrollmentId, stepId: link.stepId },
        data: { firstClickedAt: new Date(), clickedCount: { increment: 1 } },
      });

      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { totalClicks: { increment: 1 } },
      });
    }

    return link.originalUrl;
  }
}
