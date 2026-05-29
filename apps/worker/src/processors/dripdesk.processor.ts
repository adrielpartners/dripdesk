import { JOB_NAMES, logger, type EvaluateProgressJobData, type SendMessageJobData, type TestJobData } from '@dripdesk/shared';
import { ProgressService } from '@dripdesk/database';
import type { Job, Queue } from 'bullmq';
import { cleanupExpiredTokens } from '../cleanup/cleanup-expired-tokens';
import { prepareMessage } from '../messages/message-preparation';
import { sendProviderMessage } from '../providers/provider-send';
import { scheduleDueSteps } from '../scheduling/schedule-due-steps';

interface DripdeskProcessorOptions {
  publicApiUrl: string;
  publicWebUrl: string;
}

export function createDripdeskProcessor(queue: Queue, options: DripdeskProcessorOptions) {
  return (job: Job) => processDripdeskJob(job, queue, options);
}

export async function processDripdeskJob(job: Job, queue: Queue, options: DripdeskProcessorOptions) {
  switch (job.name) {
    case JOB_NAMES.TEST_JOB:
      return processTestJob(job as Job<TestJobData>);
    case JOB_NAMES.SCHEDULE_DUE_STEPS:
      return scheduleDueSteps(job, queue);
    case JOB_NAMES.SEND_MESSAGE:
      return processSendMessage(job as Job<SendMessageJobData>, options.publicApiUrl, options.publicWebUrl);
    case JOB_NAMES.PROCESS_PROVIDER_EVENT:
      return processProviderEvent(job);
    case JOB_NAMES.EVALUATE_PROGRESS:
      return processEvaluateProgress(job as Job<EvaluateProgressJobData>);
    case JOB_NAMES.CLEANUP_EXPIRED_TOKENS:
      return processCleanupExpiredTokens();
    default:
      throw new Error(`Unknown job name: ${job.name}`);
  }
}

async function processSendMessage(job: Job<SendMessageJobData>, publicApiUrl: string, publicWebUrl: string) {
  const outbox = await prepareMessage(job.data, publicApiUrl, publicWebUrl);
  const sendResult = await sendProviderMessage({ outboxId: outbox.id });
  const progress = await new ProgressService().evaluateEnrollment(job.data.enrollmentId);

  logger.info('Prepared outbound message', {
    jobId: job.id,
    jobName: job.name,
    outboxId: outbox.id,
    enrollmentId: job.data.enrollmentId,
    campaignStepId: job.data.campaignStepId,
    channel: job.data.channel,
    provider: sendResult.provider,
    progress,
  });

  return { outboxId: outbox.id, preparedAt: outbox.preparedAt.toISOString(), sendResult, progress };
}

async function processEvaluateProgress(job: Job<EvaluateProgressJobData>) {
  const progress = await new ProgressService().evaluateEnrollment(job.data.enrollmentId);

  logger.info('Evaluated enrollment progress', {
    jobId: job.id,
    jobName: job.name,
    enrollmentId: job.data.enrollmentId,
    progress,
  });

  return progress;
}

async function processTestJob(job: Job<TestJobData>) {
  logger.info('Processed queue test job', {
    jobId: job.id,
    jobName: job.name,
    organizationId: job.data.organizationId,
    requestedBy: job.data.requestedBy,
    requestedAt: job.data.requestedAt,
  });

  return { processedAt: new Date().toISOString() };
}

async function processCleanupExpiredTokens() {
  const result = await cleanupExpiredTokens();
  logger.info('Cleaned up expired tokens', result);
  return result;
}

/**
 * Provider events (delivery status, inbound replies) are processed inline
 * by the API webhooks controller. This queued path is a secondary pipeline
 * for future batching or retry handling; for now, log it and acknowledge.
 */
async function processProviderEvent(job: Job) {
  logger.info('Provider event received via queue', { jobId: job.id, jobName: job.name, data: job.data });
  return { received: true, queueProcessed: true };
}