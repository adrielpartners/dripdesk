import { JOB_NAMES, QUEUE_DEFAULTS, logger, type Channel, type SendMessageJobData } from '@dripdesk/shared';
import { prisma, type CampaignScheduleType, type PrismaClient } from '@dripdesk/database';
import type { Prisma } from '@dripdesk/database';
import type { Job, Queue } from 'bullmq';
import { isStepDue, type ScheduleConfig } from './schedule-rules';

const MAX_ORGS_PER_CYCLE = 10;
const MAX_CANDIDATES_PER_ORG = 20;

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

  for (const orgId of orgIds.slice(0, MAX_ORGS_PER_CYCLE)) {
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
    orgsProcessed: Math.min(orgIds.length, MAX_ORGS_PER_CYCLE),
    checkedCount,
    dueCount,
    enqueuedCount,
  });

  return { orgsProcessed: Math.min(orgIds.length, MAX_ORGS_PER_CYCLE), checkedCount, dueCount, enqueuedCount };
}

/**
 * Get distinct organization IDs that have at least one eligible pending step.
 * This ensures each org gets fair processing time per cycle.
 */
async function getEligibleOrgIds(client: PrismaClient) {
  const rows = await client.enrollmentStepState.findMany({
    where: {
      status: 'pending',
      enrollment: {
        status: 'active',
        person: { status: 'active' },
        campaign: { status: 'active' },
      },
    },
    select: {
      enrollment: {
        select: { organizationId: true },
      },
    },
    distinct: ['enrollmentId'],
  });

  const orgIdSet = new Set<string>();
  for (const row of rows) {
    orgIdSet.add(row.enrollment.organizationId);
  }

  return Array.from(orgIdSet);
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
