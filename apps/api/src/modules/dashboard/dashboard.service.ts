import { Injectable } from '@nestjs/common';
import { MessageEventType } from '@prisma/client';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_CONTACT_WINDOW_DAYS = 30;
const CAMPAIGN_PERFORMANCE_LIMIT = 20;

type RateCounts = {
  sentMessages: number;
  openedEvents: number;
  clickedEvents: number;
  completedEnrollments: number;
  totalEnrollments: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenant: TenantContext) {
    const [activeContacts, campaignCount, summaryCounts, campaigns] = await Promise.all([
      this.countActiveContacts(tenant),
      this.prisma.campaign.count({
        where: {
          organizationId: tenant.organizationId,
          archivedAt: null,
        },
      }),
      this.findSummaryCounts(tenant),
      this.findCampaignsForPerformanceList(tenant),
    ]);

    const campaignMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const counts = await this.findCampaignCounts(tenant, campaign.id);

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          activeEnrolledCount: campaign._count.enrollments,
          openRate: this.rate(counts.openedEvents, counts.sentMessages),
          clickRate: this.rate(counts.clickedEvents, counts.sentMessages),
          completionRate: this.rate(counts.completedEnrollments, counts.totalEnrollments),
          lastSentAt: campaign.messageOutbox[0]?.sentAt?.toISOString() ?? null,
        };
      }),
    );

    return {
      metrics: {
        activeContacts,
        averageOpenRate: this.rate(summaryCounts.openedEvents, summaryCounts.sentMessages),
        averageClickRate: this.rate(summaryCounts.clickedEvents, summaryCounts.sentMessages),
        averageCompletionRate: this.rate(summaryCounts.completedEnrollments, summaryCounts.totalEnrollments),
      },
      campaignCount,
      campaignPerformance: campaignMetrics,
      meta: {
        activeContactWindowDays: ACTIVE_CONTACT_WINDOW_DAYS,
        campaignPerformanceLimit: CAMPAIGN_PERFORMANCE_LIMIT,
      },
    };
  }

  private async countActiveContacts(tenant: TenantContext) {
    const activeContacts = await this.prisma.enrollment.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: 'active',
        enrolledAt: { gte: this.activeContactWindowStart() },
      },
      distinct: ['personId'],
      select: { personId: true },
    });

    return activeContacts.length;
  }

  private async findSummaryCounts(tenant: TenantContext): Promise<RateCounts> {
    const [sentMessages, openedEvents, clickedEvents, completedEnrollments, totalEnrollments] = await Promise.all([
      this.prisma.messageOutbox.count({
        where: {
          organizationId: tenant.organizationId,
          status: 'sent',
          sentAt: { not: null },
        },
      }),
      this.countEventsForTenant(tenant, 'opened'),
      this.countEventsForTenant(tenant, 'clicked'),
      this.prisma.enrollment.count({
        where: {
          organizationId: tenant.organizationId,
          status: 'completed',
        },
      }),
      this.prisma.enrollment.count({
        where: {
          organizationId: tenant.organizationId,
          status: { not: 'removed' },
        },
      }),
    ]);

    return { sentMessages, openedEvents, clickedEvents, completedEnrollments, totalEnrollments };
  }

  private findCampaignsForPerformanceList(tenant: TenantContext) {
    return this.prisma.campaign.findMany({
      where: {
        organizationId: tenant.organizationId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            enrollments: {
              where: {
                organizationId: tenant.organizationId,
                status: 'active',
              },
            },
          },
        },
        messageOutbox: {
          where: {
            organizationId: tenant.organizationId,
            status: 'sent',
            sentAt: { not: null },
          },
          select: {
            sentAt: true,
          },
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: CAMPAIGN_PERFORMANCE_LIMIT,
    });
  }

  private async findCampaignCounts(tenant: TenantContext, campaignId: string): Promise<RateCounts> {
    const [sentMessages, openedEvents, clickedEvents, completedEnrollments, totalEnrollments] = await Promise.all([
      this.prisma.messageOutbox.count({
        where: {
          organizationId: tenant.organizationId,
          campaignId,
          status: 'sent',
          sentAt: { not: null },
        },
      }),
      this.countEventsForCampaign(tenant, campaignId, 'opened'),
      this.countEventsForCampaign(tenant, campaignId, 'clicked'),
      this.prisma.enrollment.count({
        where: {
          organizationId: tenant.organizationId,
          campaignId,
          status: 'completed',
        },
      }),
      this.prisma.enrollment.count({
        where: {
          organizationId: tenant.organizationId,
          campaignId,
          status: { not: 'removed' },
        },
      }),
    ]);

    return { sentMessages, openedEvents, clickedEvents, completedEnrollments, totalEnrollments };
  }

  private countEventsForTenant(tenant: TenantContext, eventType: MessageEventType) {
    return this.prisma.messageEvent.count({
      where: {
        organizationId: tenant.organizationId,
        eventType,
        messageOutbox: {
          organizationId: tenant.organizationId,
          status: 'sent',
          sentAt: { not: null },
        },
      },
    });
  }

  private countEventsForCampaign(tenant: TenantContext, campaignId: string, eventType: MessageEventType) {
    return this.prisma.messageEvent.count({
      where: {
        organizationId: tenant.organizationId,
        eventType,
        messageOutbox: {
          organizationId: tenant.organizationId,
          campaignId,
          status: 'sent',
          sentAt: { not: null },
        },
      },
    });
  }

  private rate(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
  }

  private activeContactWindowStart() {
    return new Date(Date.now() - ACTIVE_CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }
}
