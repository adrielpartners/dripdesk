import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(orgId: string) {
    const [totalPersons, activeCampaigns, activeEnrollments, completedEnrollments] =
      await Promise.all([
        this.prisma.person.count({ where: { organizationId: orgId, deletedAt: null } }),
        this.prisma.campaign.count({ where: { organizationId: orgId, status: 'ACTIVE', deletedAt: null } }),
        this.prisma.enrollment.count({ where: { campaign: { organizationId: orgId }, status: 'ACTIVE' } }),
        this.prisma.enrollment.count({ where: { campaign: { organizationId: orgId }, status: 'COMPLETED' } }),
      ]);

    const recentCampaigns = await this.prisma.campaign.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const recentEnrollments = await this.prisma.enrollment.findMany({
      where: { campaign: { organizationId: orgId } },
      include: {
        person: { select: { firstName: true, lastName: true, email: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      kpis: { totalPersons, activeCampaigns, activeEnrollments, completedEnrollments },
      recentCampaigns,
      recentEnrollments,
    };
  }

  async getCampaignAnalytics(campaignId: string, orgId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
      include: {
        steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!campaign) return null;

    const enrollmentsByStatus = await this.prisma.enrollment.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const stepStats = await Promise.all(
      campaign.steps.map(async (step) => {
        const states = await this.prisma.enrollmentStepState.groupBy({
          by: ['status'],
          where: { stepId: step.id },
          _count: true,
        });
        return { step: { id: step.id, name: step.name, order: step.order }, states };
      }),
    );

    return { campaign, enrollmentsByStatus, stepStats };
  }
}
