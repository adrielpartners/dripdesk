import { QUEUE_DEFAULTS, QUEUE_NAMES } from '@dripdesk/shared';
import { logger } from '@dripdesk/shared';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { loadWorkerConfig } from './config/worker-config';
import { registerScheduledJobs } from './jobs/register-scheduled-jobs';
import { createDripdeskProcessor } from './processors/dripdesk.processor';
import { createBullmqConnectionOptions } from './queue/connection';

async function bootstrap() {
  const config = loadWorkerConfig();
  const connection = createBullmqConnectionOptions(config.redisUrl);

  const queue = new Queue(QUEUE_NAMES.DRIPDESK, {
    connection,
    defaultJobOptions: {
      attempts: QUEUE_DEFAULTS.ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: QUEUE_DEFAULTS.BACKOFF_DELAY_MS,
      },
      removeOnComplete: QUEUE_DEFAULTS.REMOVE_ON_COMPLETE,
      removeOnFail: QUEUE_DEFAULTS.REMOVE_ON_FAIL,
    },
  });

  const worker = new Worker(
    QUEUE_NAMES.DRIPDESK,
    createDripdeskProcessor(queue, { publicApiUrl: config.publicApiUrl, publicWebUrl: config.publicWebUrl }),
    {
      connection,
      concurrency: config.workerConcurrency || QUEUE_DEFAULTS.WORKER_CONCURRENCY,
    },
  );

  const queueEvents = new QueueEvents(QUEUE_NAMES.DRIPDESK, {
    connection,
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, jobName: job.name });
  });

  worker.on('failed', (job, error) => {
    logger.error('Job failed', { jobId: job?.id, jobName: job?.name, error: error.message });
  });

  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  queueEvents.on('error', (error) => {
    logger.error('Queue events error', { error: error.message });
  });

  await Promise.all([queue.waitUntilReady(), worker.waitUntilReady(), queueEvents.waitUntilReady()]);
  await registerScheduledJobs(queue);

  logger.info('DripDesk worker started', {
    env: config.env,
    queue: QUEUE_NAMES.DRIPDESK,
    concurrency: config.workerConcurrency,
  });

  async function shutdown() {
    logger.info('DripDesk worker shutting down');
    await Promise.all([worker.close(), queueEvents.close(), queue.close()]);
  }

  process.once('SIGTERM', () => {
    void shutdown().then(() => process.exit(0));
  });
  process.once('SIGINT', () => {
    void shutdown().then(() => process.exit(0));
  });
}

void bootstrap().catch((error) => {
  logger.error('DripDesk worker failed to start', { error: error.message });
  process.exit(1);
});
