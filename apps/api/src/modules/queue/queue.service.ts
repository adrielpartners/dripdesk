import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JOB_NAMES, QUEUE_DEFAULTS, QUEUE_NAMES, type TestJobData } from '@dripdesk/shared';
import { Queue } from 'bullmq';
import { TenantContext } from '../../common/tenant/tenant-context';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.queue = new Queue(QUEUE_NAMES.DRIPDESK, {
      connection: this.createConnectionOptions(),
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
  }

  async enqueueTestJob(tenant: TenantContext) {
    const payload: TestJobData = {
      requestedBy: tenant.userId,
      organizationId: tenant.organizationId,
      requestedAt: new Date().toISOString(),
    };

    const job = await this.queue.add(JOB_NAMES.TEST_JOB, payload);

    return {
      queue: QUEUE_NAMES.DRIPDESK,
      jobId: job.id,
      jobName: job.name,
    };
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  private createConnectionOptions() {
    const parsed = new URL(this.configService.get<string>('dripdesk.redisUrl', 'redis://localhost:6379'));

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
      connectTimeout: 5000,
      maxRetriesPerRequest: null,
      retryStrategy: (attempt: number) => (attempt > 3 ? null : Math.min(attempt * 500, 2000)),
    };
  }
}
