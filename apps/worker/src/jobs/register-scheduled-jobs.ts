import { JOB_NAMES, QUEUE_DEFAULTS, logger } from '@dripdesk/shared';
import type { Queue } from 'bullmq';

export async function registerScheduledJobs(queue: Queue) {
  await queue.upsertJobScheduler(
    JOB_NAMES.SCHEDULE_DUE_STEPS,
    { every: QUEUE_DEFAULTS.SCHEDULE_DUE_STEPS_EVERY_MS },
    {
      name: JOB_NAMES.SCHEDULE_DUE_STEPS,
      data: { scheduledAt: new Date().toISOString() },
      opts: {
        attempts: QUEUE_DEFAULTS.ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE_DEFAULTS.BACKOFF_DELAY_MS,
        },
      },
    },
  );

  logger.info('Registered scheduled jobs', {
    jobs: [JOB_NAMES.SCHEDULE_DUE_STEPS],
    everyMs: QUEUE_DEFAULTS.SCHEDULE_DUE_STEPS_EVERY_MS,
  });
}