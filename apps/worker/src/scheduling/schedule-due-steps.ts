import { JOB_NAMES, QUEUE_DEFAULTS, logger, type Channel, type SendMessageJobData } from '@dripdesk/shared';
import { prisma, type PrismaClient } from '@dripdesk/database';
import type { Prisma } from '@dripdesk/database';
import type { Job, Queue } from 'bullmq';
import { isStepDue, type ScheduleConfig } from './schedule-rules';

const MAX_ORGS_PER_CYCLE = 10;
const MAX_CANDIDATES_PER_ORG = 20;
let nextOrgOffset = 0;

type DueCandidate = Prisma.EnrollmentStepStateGetPayload<{
  include: {
    enrollment: {
      include: {
        person: { include: { channels: true } };
        campaign: { include: { organization: true } };
      };
    };
    campaignStep: true;
  };
}>;

export async function scheduleDueSteps(job: Job, queue: Queue, client: PrismaClient = prisma) {
  const now = new Date();
  const orgIds = await getEligibleOrgIds(client);

  let checkedCount = 0;
  let dueCount = 0;
  let enqueuedCount = 0;

  const selectedOrgIds = rotateOrganizations(orgIds, MAX_ORGS_PER_CYCLE);
  for (const orgId of selectedOrgIds) {
    const candidates = await client.enrollmentStepState.findMany({
      where: {
        status: 'pending',
        enrollment: {
          organizationId: orgId,
          status: 'active',
          person: { status: 'active' },
          campaign: { status: 'active' },
        },
      },
      include: {
        enrollment: {
          include: {
            person: {
              include: { channels: true },
            },
            campaign: {
              include: { organization: true },
            },
          },
        },
        campaignStep: true,
      },
      take: MAX_CANDIDATES_PER_ORG,
    });

    checkedCount += candidates.length;

    for (const candidate of candidates) {
      if (candidate.enrollment.currentStepOrder !== candidate.stepOrder) continue;

      const timezone = candidate.enrollment.person.timezone ?? candidate.enrollment.campaign.organization.defaultTimezone;
      const due = isStepDue({
        scheduleType: candidate.enrollment.campaign.scheduleType,
        scheduleConfig: asScheduleConfig(candidate.enrollment.campaign.scheduleConfig),
        enrolledAt: candidate.enrollment.enrolledAt,
        now,
        timezone,
        stepOrder: candidate.stepOrder,
        delayDaysOverride: candidate.campaignStep.delayDaysOverride,
      });

      if (!due) continue;
      dueCount += 1;

      const channels = deliveryChannels(candidate);
      if (channels.length === 0) {
        logger.warn('Due step has no enabled delivery channels', {
          enrollmentId: candidate.enrollmentId,
          campaignStepId: candidate.campaignStepId,
        });
        continue;
      }

      // Queue first: a Redis failure must leave the step pending for the next cycle.
      await queue.addBulk(channels.map((channel) => ({
        name: JOB_NAMES.SEND_MESSAGE,
        data: {
          enrollmentId: candidate.enrollmentId,
          campaignStepId: candidate.campaignStepId,
          channel,
        } satisfies SendMessageJobData,
        opts: {
          jobId: sendMessageJobId(candidate.enrollmentId, candidate.campaignStepId, channel),
          attempts: QUEUE_DEFAULTS.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: QUEUE_DEFAULTS.BACKOFF_DELAY_MS,
          },
        },
      })));

      await client.enrollmentStepState.updateMany({
        where: {
          id: candidate.id,
          status: 'pending',
        },
        data: {
          status: 'queued',
        },
      });
      enqueuedCount += channels.length;
    }
  }

  logger.info('Scheduled due steps', {
    jobId: job.id,
    orgsProcessed: selectedOrgIds.length,
    checkedCount,
    dueCount,
    enqueuedCount,
  });

  return { orgsProcessed: selectedOrgIds.length, checkedCount, dueCount, enqueuedCount };
}

/**
 * Get distinct organization IDs that have at least one eligible pending step.
 * Grouping enrollments avoids loading every pending step-state row into memory.
 */
async function getEligibleOrgIds(client: PrismaClient) {
  const rows = await client.enrollment.groupBy({
    by: ['organizationId'],
    where: {
      status: 'active',
      person: { status: 'active' },
      campaign: { status: 'active' },
      stepStates: { some: { status: 'pending' } },
    },
    orderBy: { organizationId: 'asc' },
  });
  return rows.map((row) => row.organizationId);
}

export function rotateOrganizations(orgIds: string[], limit: number) {
  if (orgIds.length === 0) return [];
  const start = nextOrgOffset % orgIds.length;
  const selected = Array.from({ length: Math.min(limit, orgIds.length) }, (_, index) => orgIds[(start + index) % orgIds.length]);
  nextOrgOffset = (start + selected.length) % orgIds.length;
  return selected;
}

function deliveryChannels(candidate: DueCandidate) {
  const requestedChannels: readonly Channel[] = candidate.campaignStep.channelOverrides.length
    ? (candidate.campaignStep.channelOverrides as Channel[])
    : (candidate.enrollment.campaign.defaultChannels as Channel[]);
  const enabledChannels = new Set(
    candidate.enrollment.person.channels
      .filter(
        (channel: { enabled: boolean; unsubscribed: boolean; suppressed: boolean; channelType: string }) =>
          channel.enabled && !channel.unsubscribed && !channel.suppressed,
      )
      .map((channel: { channelType: string }) => channel.channelType),
  );

  return requestedChannels.filter((channel: Channel) => enabledChannels.has(channel));
}

function sendMessageJobId(enrollmentId: string, campaignStepId: string, channel: Channel) {
  return `send-message-${enrollmentId}-${campaignStepId}-${channel}`;
}

function asScheduleConfig(value: unknown): ScheduleConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as ScheduleConfig;
}
