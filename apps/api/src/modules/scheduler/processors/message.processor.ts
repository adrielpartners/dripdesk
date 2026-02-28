import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessagingService } from '../../messaging/messaging.service';
import { SchedulerService } from '../scheduler.service';
import { MessageJobData, QUEUE_NAMES, JOB_NAMES } from '@dripdesk/shared';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor(QUEUE_NAMES.MESSAGES)
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private messagingService: MessagingService,
    private schedulerService: SchedulerService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>) {
    const { enrollmentId, stepId, channels } = job.data;

    this.logger.log(`Processing message job for enrollment ${enrollmentId}, step ${stepId}`);

    const results = await this.messagingService.sendStepMessage(enrollmentId, stepId, channels);

    const campaign = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { campaign: true },
    });

    if (campaign?.campaign.completionMode === 'TIME_BASED') {
      await this.prisma.enrollmentStepState.updateMany({
        where: { enrollmentId, stepId, status: { in: ['SENT', 'QUEUED'] } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionMethod: 'TIME',
        },
      });

      await this.schedulerService.advanceEnrollment(enrollmentId, stepId);
    }

    return results;
  }
}
