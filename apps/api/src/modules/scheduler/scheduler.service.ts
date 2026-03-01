import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageQueue } from './queues/message.queue';
import { parseTimeString } from '@dripdesk/shared';
import { addDays, setHours, setMinutes, setSeconds, isAfter, isBefore } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private messageQueue: MessageQueue,
  ) {}

  async queueNextMessages(enrollmentIds: string[]) {
    for (const enrollmentId of enrollmentIds) {
      await this.queueNextMessage(enrollmentId);
    }
  }

  async queueNextMessage(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        campaign: true,
        stepStates: {
          where: { status: { in: ['PENDING', 'QUEUED'] } },
          include: { step: true },
          orderBy: { step: { order: 'asc' } },
          take: 1,
        },
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') return;
    if (!enrollment.stepStates.length) return;

    const stepState = enrollment.stepStates[0];
    const step = stepState.step;
    const campaign = enrollment.campaign;

    const delay = this.calculateDelay(enrollment, step, campaign);

    await this.prisma.enrollmentStepState.update({
      where: { id: stepState.id },
      data: { status: 'QUEUED', scheduledAt: new Date(Date.now() + delay) },
    });

    await this.messageQueue.addMessageJob(
      {
        enrollmentId,
        stepId: step.id,
        channels: campaign.channelsEnabled,
      },
      delay,
    );

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextStepAt: new Date(Date.now() + delay) },
    });
  }

  async advanceEnrollment(enrollmentId: string, completedStepId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        campaign: { include: { steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } } } },
        stepStates: { include: { step: true } },
      },
    });

    if (!enrollment) return;

    const completedStep = enrollment.campaign.steps.find((s) => s.id === completedStepId);
    if (!completedStep) return;

    const nextStep = enrollment.campaign.steps.find((s) => s.order === completedStep.order + 1);

    if (!nextStep) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionPercentage: 100,
          currentStepOrder: completedStep.order,
        },
      });
      return;
    }

    const existing = await this.prisma.enrollmentStepState.findUnique({
      where: { enrollmentId_stepId: { enrollmentId, stepId: nextStep.id } },
    });

    if (!existing) {
      await this.prisma.enrollmentStepState.create({
        data: {
          enrollmentId,
          stepId: nextStep.id,
          status: 'PENDING',
        },
      });
    }

    const completedCount = enrollment.stepStates.filter((s) => s.status === 'COMPLETED').length + 1;
    const totalSteps = enrollment.campaign.steps.length;
    const completionPercentage = Math.round((completedCount / totalSteps) * 100);

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStepOrder: nextStep.order,
        completionPercentage,
      },
    });

    await this.queueNextMessage(enrollmentId);
  }

  async pauseEnrollmentJobs(enrollmentId: string) {
    const stepStates = await this.prisma.enrollmentStepState.findMany({
      where: { enrollmentId, status: 'QUEUED' },
    });

    for (const state of stepStates) {
      await this.messageQueue.removeJob(enrollmentId, state.stepId);
    }
  }

  private calculateDelay(enrollment: any, step: any, campaign: any): number {
    const timezone = campaign.timezone || 'UTC';
    const sendTimeStr = step.sendTimeOverride ?? campaign.sendTime ?? '09:00';
    const { hours, minutes } = parseTimeString(sendTimeStr);

    const now = new Date();
    const nowInTz = toZonedTime(now, timezone);

    let targetDate = new Date(nowInTz);

    if (step.order === 1 && enrollment.currentStepOrder === 1) {
      const todaySendTime = setSeconds(setMinutes(setHours(targetDate, hours), minutes), 0);

      if (isAfter(todaySendTime, nowInTz)) {
        targetDate = todaySendTime;
      } else {
        targetDate = addDays(todaySendTime, 1);
      }
    } else {
      targetDate = addDays(targetDate, step.delayDays);
      targetDate = setSeconds(setMinutes(setHours(targetDate, hours), minutes), 0);
    }

    const targetUtc = fromZonedTime(targetDate, timezone);
    const delay = Math.max(0, targetUtc.getTime() - Date.now());

    return delay;
  }
}
