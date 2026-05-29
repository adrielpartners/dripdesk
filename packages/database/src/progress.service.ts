import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

type ProgressClient = PrismaClient;

export interface ProgressEvaluationResult {
  enrollmentId: string;
  completedStep: boolean;
  completedCampaign: boolean;
  reason: string;
  currentStepOrder?: number;
  nextStepOrder?: number;
}

export class ProgressService {
  constructor(private readonly client: ProgressClient = prisma) {}

  async evaluateEnrollment(enrollmentId: string, now = new Date()): Promise<ProgressEvaluationResult> {
    const enrollment = await this.client.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        campaign: {
          include: {
            steps: {
              where: { status: 'published' },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
        stepStates: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!enrollment) {
      return { enrollmentId, completedStep: false, completedCampaign: false, reason: 'enrollment_not_found' };
    }

    if (enrollment.status !== 'active') {
      return { enrollmentId, completedStep: false, completedCampaign: false, reason: 'enrollment_not_active' };
    }

    const currentState = enrollment.stepStates.find((state) => state.stepOrder === enrollment.currentStepOrder);
    if (!currentState) {
      return { enrollmentId, completedStep: false, completedCampaign: false, reason: 'current_step_not_found' };
    }

    if (currentState.status === 'completed') {
      return {
        enrollmentId,
        completedStep: false,
        completedCampaign: false,
        reason: 'current_step_already_completed',
        currentStepOrder: currentState.stepOrder,
      };
    }

    const currentStep = enrollment.campaign.steps.find((step) => step.id === currentState.campaignStepId);
    if (!currentStep) {
      return {
        enrollmentId,
        completedStep: false,
        completedCampaign: false,
        reason: 'current_campaign_step_not_published',
        currentStepOrder: currentState.stepOrder,
      };
    }

    const shouldComplete = await this.shouldCompleteCurrentStep({
      enrollmentId,
      campaignStepId: currentState.campaignStepId,
      progressRule: enrollment.campaign.progressRule,
      replyRequiredPhrases: currentStep.replyRequiredPhrases,
      clickedAt: currentState.clickedAt,
      repliedAt: currentState.repliedAt,
      status: currentState.status,
    });

    if (!shouldComplete.complete) {
      return {
        enrollmentId,
        completedStep: false,
        completedCampaign: false,
        reason: shouldComplete.reason,
        currentStepOrder: currentState.stepOrder,
      };
    }

    const nextStep = enrollment.campaign.steps.find((step) => step.stepOrder > currentState.stepOrder);
    return this.completeCurrentStep({
      enrollmentId,
      organizationId: enrollment.organizationId,
      currentStateId: currentState.id,
      currentStepOrder: currentState.stepOrder,
      nextStepOrder: nextStep?.stepOrder,
      completedCampaign: !nextStep,
      now,
      reason: shouldComplete.reason,
    });
  }

  private async shouldCompleteCurrentStep(input: {
    enrollmentId: string;
    campaignStepId: string;
    progressRule: 'time_based' | 'link_click_required' | 'reply_required';
    replyRequiredPhrases: string[];
    clickedAt: Date | null;
    repliedAt: Date | null;
    status: string;
  }) {
    if (input.progressRule === 'time_based') {
      return {
        complete: ['queued', 'sent', 'delivered', 'clicked', 'replied'].includes(input.status),
        reason: 'time_based_ready',
      };
    }

    if (input.progressRule === 'link_click_required') {
      if (input.clickedAt) return { complete: true, reason: 'link_clicked' };

      const click = await this.client.messageEvent.findFirst({
        where: {
          enrollmentId: input.enrollmentId,
          eventType: 'clicked',
          trackedLink: { is: { campaignStepId: input.campaignStepId } },
        },
      });

      return { complete: Boolean(click), reason: click ? 'link_clicked' : 'link_click_required' };
    }

    if (input.repliedAt && input.replyRequiredPhrases.length === 0) {
      return { complete: true, reason: 'any_reply_received' };
    }

    const replies = await this.client.messageEvent.findMany({
      where: {
        enrollmentId: input.enrollmentId,
        eventType: 'replied',
        messageOutbox: { is: { campaignStepId: input.campaignStepId } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

    if (input.replyRequiredPhrases.length === 0) {
      return { complete: replies.length > 0, reason: replies.length > 0 ? 'any_reply_received' : 'reply_required' };
    }

    const matched = replies.some((reply) => replyMatchesRequiredPhrases(replyTextFromMetadata(reply.metadata), input.replyRequiredPhrases));
    return { complete: matched, reason: matched ? 'reply_phrase_matched' : 'reply_phrase_required' };
  }

  private async completeCurrentStep(input: {
    enrollmentId: string;
    organizationId: string;
    currentStateId: string;
    currentStepOrder: number;
    nextStepOrder?: number;
    completedCampaign: boolean;
    now: Date;
    reason: string;
  }): Promise<ProgressEvaluationResult> {
    return this.client.$transaction(async (tx) => {
      const completed = await tx.enrollmentStepState.updateMany({
        where: {
          id: input.currentStateId,
          status: { not: 'completed' },
        },
        data: {
          status: 'completed',
          completedAt: input.now,
        },
      });

      if (completed.count !== 1) {
        return {
          enrollmentId: input.enrollmentId,
          completedStep: false,
          completedCampaign: false,
          reason: 'current_step_already_completed',
          currentStepOrder: input.currentStepOrder,
        };
      }

      await tx.messageEvent.create({
        data: {
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          eventType: 'completed',
          occurredAt: input.now,
          metadata: {
            stepOrder: input.currentStepOrder,
            reason: input.reason,
          },
        },
      });

      if (input.completedCampaign) {
        await tx.enrollment.update({
          where: { id: input.enrollmentId },
          data: {
            status: 'completed',
            completedAt: input.now,
          },
        });
      } else {
        await tx.enrollment.update({
          where: { id: input.enrollmentId },
          data: {
            currentStepOrder: input.nextStepOrder,
          },
        });
      }

      return {
        enrollmentId: input.enrollmentId,
        completedStep: true,
        completedCampaign: input.completedCampaign,
        reason: input.reason,
        currentStepOrder: input.currentStepOrder,
        nextStepOrder: input.nextStepOrder,
      };
    });
  }
}

export function normalizeReplyText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function replyMatchesRequiredPhrases(replyText: string, requiredPhrases: string[]) {
  const normalizedReply = normalizeReplyText(replyText);
  return requiredPhrases.some((phrase) => {
    const normalizedPhrase = normalizeReplyText(phrase);
    return normalizedPhrase.length > 0 && normalizedReply.includes(normalizedPhrase);
  });
}

export function replyTextFromMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';

  const record = metadata as Record<string, unknown>;
  for (const key of ['text', 'replyText', 'body', 'message']) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }

  return '';
}
