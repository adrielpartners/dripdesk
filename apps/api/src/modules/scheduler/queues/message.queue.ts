import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../../../redis/redis.service';
import { MessageJobData, QUEUE_NAMES, JOB_NAMES } from '@dripdesk/shared';

@Injectable()
export class MessageQueue {
  private readonly logger = new Logger(MessageQueue.name);
  private queue: Queue;

  constructor(private redis: RedisService) {
    this.queue = new Queue(QUEUE_NAMES.MESSAGES, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
  }

  async addMessageJob(data: MessageJobData, delay?: number) {
    const jobId = `msg-${data.enrollmentId}-${data.stepId}`;
    return this.queue.add(JOB_NAMES.SEND_MESSAGE, data, {
      jobId,
      delay,
    });
  }

  async removeJob(enrollmentId: string, stepId: string) {
    const jobId = `msg-${enrollmentId}-${stepId}`;
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }

  async getQueue() {
    return this.queue;
  }
}
