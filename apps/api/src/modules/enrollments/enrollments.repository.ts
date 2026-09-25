import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BILLING_PLAN_ACTIVE_CONTACT_LIMITS, ACTIVE_CONTACT_WINDOW_DAYS } from '@dripdesk/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context';

@Injectable()
export class EnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyForCampaign(tenant: TenantContext, campaignId: string, page: number, limit: number) {
    await this.findCampaignForTenant(tenant, campaignId);
    return this.findManyForTenant({ organizationId: tenant.organizationId, campaignId: campaignId.toUpperCase() }, page, limit);
  }

  async findManyForPerson(tenant: TenantContext, personId: string, page: number, limit: number) {
    await this.findPersonForTenant(tenant, personId);
    return this.findManyForTenant({ organizationId: tenant.organizationId, personId }, page, limit);
  }

  async findUsageForTenant(tenant: TenantContext) {
    const [activeContacts, usage] = await Promise.all([this.countActiveContacts(tenant), this.findActiveContactLimit(tenant)]);
    return {
      plan: usage.planId,
      activeContacts,
      activeContactLimit: usage.activeContactLimit,
      remainingActiveContacts:
        usage.activeContactLimit === null ? null : Math.max(0, usage.activeContactLimit - activeContacts),
      activeContactWindowDays: ACTIVE_CONTACT_WINDOW_DAYS,
    };
  }

  async createForTenant(tenant: TenantContext, campaignId: string, personId: string, client: Prisma.TransactionClient = this.prisma) {
    const [campaign, person] = await Promise.all([
      this.findCampaignForTenant(tenant, campaignId, client),
      this.findPersonForTenant(tenant, personId, client),
    ]);

    if (campaign.status !== 'active') {
      throw new ConflictException('Campaign must be active before enrolling people');
    }

    const steps = await client.campaignStep.findMany({
      where: {
        campaignId: campaign.id,
        status: 'published',
      },
      orderBy: { stepOrder: 'asc' },
    });

    if (!steps.length) {
      throw new ConflictException('Campaign must have at least one published step before enrollment');
    }

    const existing = await client.enrollment.findUnique({
      where: { personId_campaignId: { personId: person.id, campaignId: campaign.id } },
    });

    if (existing && existing.status !== 'removed') {
      throw new ConflictException('Person already has an enrollment for this campaign');
    }

    await this.assertActiveContactCapacity(tenant, person.id, client);

    if (existing?.status === 'removed') {
      await client.enrollmentStepState.deleteMany({ where: { enrollmentId: existing.id } });
      return client.enrollment.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          currentStepOrder: steps[0].stepOrder,
          enrolledAt: new Date(),
          pausedAt: null,
          removedAt: null,
          completedAt: null,
          stepStates: {
            create: steps.map((step) => ({
              campaignStepId: step.id,
              stepOrder: step.stepOrder,
              status: 'pending',
            })),
          },
        },
        include: this.includeEnrollment(),
      });
    }

    return client.enrollment.create({
      data: {
        organizationId: tenant.organizationId,
        campaignId: campaign.id,
        personId: person.id,
        currentStepOrder: steps[0].stepOrder,
        stepStates: {
          create: steps.map((step) => ({
            campaignStepId: step.id,
            stepOrder: step.stepOrder,
            status: 'pending',
          })),
        },
      },
      include: this.includeEnrollment(),
    });
  }

  async pauseForTenant(tenant: TenantContext, id: string) {
    const enrollment = await this.findByIdForTenant(tenant, id);
    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'paused', pausedAt: new Date() },
      include: this.includeEnrollment(),
    });
  }

  async removeForTenant(tenant: TenantContext, id: string) {
    const enrollment = await this.findByIdForTenant(tenant, id);
    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'removed', removedAt: new Date() },
      include: this.includeEnrollment(),
    });
  }

  private async findManyForTenant(where: Prisma.EnrollmentWhereInput, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: this.includeEnrollment(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async findByIdForTenant(tenant: TenantContext, id: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, organizationId: tenant.organizationId },
      include: this.includeEnrollment(),
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  private async findCampaignForTenant(tenant: TenantContext, campaignId: string, client: Prisma.TransactionClient = this.prisma) {
    const campaign = await client.campaign.findFirst({
      where: {
        id: campaignId.toUpperCase(),
        organizationId: tenant.organizationId,
        status: { not: 'archived' },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  private async findPersonForTenant(tenant: TenantContext, personId: string, client: Prisma.TransactionClient = this.prisma) {
    const person = await client.person.findFirst({
      where: {
        id: personId,
        organizationId: tenant.organizationId,
        status: { not: 'archived' },
      },
    });

    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  private async assertActiveContactCapacity(tenant: TenantContext, personId: string, client: Prisma.TransactionClient = this.prisma) {
    const [activeContactPersonIds, targetActiveEnrollment] = await Promise.all([
      this.activeContactPersonIds(tenant, client),
      client.enrollment.findFirst({
        where: {
          organizationId: tenant.organizationId,
          personId,
          status: 'active',
          enrolledAt: { gte: this.activeContactWindowStart() },
        },
        select: { id: true },
      }),
    ]);

    if (targetActiveEnrollment) return;

    const usage = await this.findActiveContactLimit(tenant, client);
    if (usage.activeContactLimit === null) return;

    if (activeContactPersonIds.length >= usage.activeContactLimit) {
      throw new ConflictException('Active contact limit reached for the current plan');
    }
  }

  private async countActiveContacts(tenant: TenantContext) {
    return (await this.activeContactPersonIds(tenant)).length;
  }

  private activeContactPersonIds(tenant: TenantContext, client: Prisma.TransactionClient = this.prisma) {
    return client.enrollment.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: 'active',
        enrolledAt: { gte: this.activeContactWindowStart() },
      },
      distinct: ['personId'],
      select: { personId: true },
    });
  }

  private activeContactWindowStart() {
    return new Date(Date.now() - ACTIVE_CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }

  private async findActiveContactLimit(tenant: TenantContext, client: Prisma.TransactionClient = this.prisma) {
    const subscription = await client.billingSubscription.findUnique({
      where: { organizationId: tenant.organizationId },
      select: { planId: true, activeContactLimit: true },
    });

    const planId = subscription?.planId ?? 'free';
    const fallbackLimit =
      BILLING_PLAN_ACTIVE_CONTACT_LIMITS[planId as keyof typeof BILLING_PLAN_ACTIVE_CONTACT_LIMITS] ??
      BILLING_PLAN_ACTIVE_CONTACT_LIMITS.free;

    return {
      planId,
      activeContactLimit: subscription?.activeContactLimit ?? fallbackLimit,
    };
  }

  private includeEnrollment() {
    return {
      person: { select: { id: true, displayName: true, status: true } },
      campaign: { select: { id: true, name: true, status: true } },
      stepStates: {
        orderBy: { stepOrder: 'asc' as const },
        include: { campaignStep: { select: { id: true, title: true, stepOrder: true } } },
      },
    };
  }
}
