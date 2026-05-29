import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_STEP_STATUSES = ['pending', 'queued', 'sent', 'delivered', 'clicked', 'replied', 'failed'] as const;

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthenticatedUser) {
    const persons = await this.findActivePersonsForUser(user);
    const personIds = persons.map((person) => person.id);

    if (!personIds.length) {
      return {
        recipient: null,
        campaigns: [],
        deletionRequested: false,
      };
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        personId: { in: personIds },
        status: { not: 'removed' },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
        stepStates: {
          select: {
            id: true,
            status: true,
            stepOrder: true,
            sentAt: true,
            completedAt: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return {
      recipient: this.toRecipientSummary(persons[0]),
      campaigns: enrollments.map((enrollment) => this.toCampaignSummary(enrollment)),
      deletionRequested: false,
    };
  }

  async getCampaign(user: AuthenticatedUser, campaignId: string) {
    const persons = await this.findActivePersonsForUser(user);
    const personIds = persons.map((person) => person.id);
    if (!personIds.length) throw new NotFoundException('Campaign not found');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        campaignId,
        personId: { in: personIds },
        status: { not: 'removed' },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
        stepStates: {
          include: {
            campaignStep: {
              select: {
                id: true,
                stepOrder: true,
                title: true,
                defaultContent: true,
                smsContent: true,
                telegramContent: true,
                emailSubject: true,
                emailBody: true,
              },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        messageOutbox: {
          select: {
            id: true,
            campaignStepId: true,
            channelType: true,
            subject: true,
            body: true,
            sentAt: true,
            preparedAt: true,
          },
          orderBy: [{ sentAt: 'desc' }, { preparedAt: 'desc' }],
        },
      },
    });

    if (!enrollment) throw new NotFoundException('Campaign not found');

    return {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      campaign: enrollment.campaign,
      progress: this.progressFor(enrollment.stepStates),
      steps: enrollment.stepStates.map((state) => {
        const outbox = enrollment.messageOutbox.find((message) => message.campaignStepId === state.campaignStepId);
        return {
          id: state.id,
          status: state.status,
          stepOrder: state.stepOrder,
          sentAt: state.sentAt,
          completedAt: state.completedAt,
          title: state.campaignStep.title,
          content: outbox?.body ?? this.stepContentFallback(state.campaignStep),
          subject: outbox?.subject ?? state.campaignStep.emailSubject,
          channelType: outbox?.channelType ?? null,
        };
      }),
    };
  }

  async getSettings(user: AuthenticatedUser) {
    const persons = await this.findPersonsForUser(user);
    const activePersons = persons.filter((person) => person.status !== 'deletion_requested');

    return {
      deletionRequested: persons.some((person) => person.status === 'deletion_requested'),
      recipients: activePersons.map((person) => ({
        id: person.id,
        displayName: person.displayName,
        status: person.status,
        channels: person.channels.map((channel) => ({
          id: channel.id,
          channelType: channel.channelType,
          address: channel.address,
          verificationStatus: channel.verificationStatus,
          enabled: channel.enabled,
          unsubscribed: channel.unsubscribed,
          suppressed: channel.suppressed,
        })),
      })),
    };
  }

  async unsubscribeFromCampaign(user: AuthenticatedUser, campaignId: string) {
    const persons = await this.findActivePersonsForUser(user);
    const personIds = persons.map((person) => person.id);
    if (!personIds.length) throw new ForbiddenException('Recipient access unavailable');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        campaignId,
        personId: { in: personIds },
        status: 'active',
      },
    });

    if (!enrollment) throw new NotFoundException('Active campaign enrollment not found');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'removed', removedAt: now },
      }),
      this.prisma.enrollmentStepState.updateMany({
        where: {
          enrollmentId: enrollment.id,
          status: { in: [...ACTIVE_STEP_STATUSES] },
        },
        data: { status: 'unsubscribed', unsubscribedAt: now },
      }),
      this.prisma.unsubscribeEvent.create({
        data: {
          organizationId: enrollment.organizationId,
          personId: enrollment.personId,
          campaignId: enrollment.campaignId,
          enrollmentId: enrollment.id,
          eventType: 'campaign_unsubscribed',
        },
      }),
    ]);

    return { unsubscribed: true, scope: 'campaign' };
  }

  async unsubscribeAll(user: AuthenticatedUser) {
    const persons = await this.findActivePersonsForUser(user);
    const personIds = persons.map((person) => person.id);
    if (!personIds.length) throw new ForbiddenException('Recipient access unavailable');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.personChannel.updateMany({
        where: { personId: { in: personIds } },
        data: { enabled: false, unsubscribed: true },
      });

      await tx.enrollment.updateMany({
        where: { personId: { in: personIds }, status: 'active' },
        data: { status: 'removed', removedAt: now },
      });

      await tx.enrollmentStepState.updateMany({
        where: {
          enrollment: { personId: { in: personIds } },
          status: { in: [...ACTIVE_STEP_STATUSES] },
        },
        data: { status: 'unsubscribed', unsubscribedAt: now },
      });

      await Promise.all(
        persons.map((person) =>
          tx.unsubscribeEvent.create({
            data: {
              organizationId: person.organizationId,
              personId: person.id,
              eventType: 'global_unsubscribed',
            },
          }),
        ),
      );
    });

    return { unsubscribed: true, scope: 'global' };
  }

  private findPersonsForUser(user: AuthenticatedUser) {
    return this.prisma.person.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
      },
      include: {
        channels: {
          orderBy: { channelType: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async findActivePersonsForUser(user: AuthenticatedUser) {
    const persons = await this.findPersonsForUser(user);
    return persons.filter((person) => person.status === 'active');
  }

  private toRecipientSummary(person: Awaited<ReturnType<PortalService['findPersonsForUser']>>[number]) {
    return {
      id: person.id,
      displayName: person.displayName,
      timezone: person.timezone,
    };
  }

  private toCampaignSummary(
    enrollment: Prisma.EnrollmentGetPayload<{
      include: {
        campaign: { select: { id: true; name: true; description: true; status: true } };
        stepStates: { select: { id: true; status: true; stepOrder: true; sentAt: true; completedAt: true } };
      };
    }>,
  ) {
    return {
      id: enrollment.campaign.id,
      enrollmentId: enrollment.id,
      name: enrollment.campaign.name,
      description: enrollment.campaign.description,
      status: enrollment.status,
      campaignStatus: enrollment.campaign.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      progress: this.progressFor(enrollment.stepStates),
    };
  }

  private progressFor(stepStates: Array<{ status: string }>) {
    const totalSteps = stepStates.length;
    const completedSteps = stepStates.filter((state) => state.status === 'completed').length;

    return {
      totalSteps,
      completedSteps,
      percent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  }

  private stepContentFallback(step: {
    defaultContent: string | null;
    emailBody: string | null;
    smsContent: string | null;
    telegramContent: string | null;
  }) {
    return step.emailBody ?? step.defaultContent ?? step.smsContent ?? step.telegramContent ?? '';
  }
}
