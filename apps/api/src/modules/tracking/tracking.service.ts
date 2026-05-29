import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { ProgressService } from '@dripdesk/database';
import { PrismaService } from '../../prisma/prisma.service';

interface ClickMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TrackingService {
  private readonly progress: ProgressService;

  constructor(private readonly prisma: PrismaService) {
    this.progress = new ProgressService(prisma);
  }

  async handleLinkClick(token: string, metadata?: ClickMetadata) {
    const link = await this.prisma.trackedLink.findUnique({
      where: { token },
    });

    if (!link) {
      throw new NotFoundException('Tracked link not found');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('Tracked link expired');
    }

    assertSafeRedirectUrl(link.originalUrl);
    const clickedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.trackedLink.update({
        where: { id: link.id },
        data: {
          clickCount: { increment: 1 },
          clickedAt,
        },
      }),
      this.prisma.messageEvent.create({
        data: {
          organizationId: link.organizationId,
          enrollmentId: link.enrollmentId,
          messageOutboxId: link.messageOutboxId,
          trackedLinkId: link.id,
          eventType: 'clicked',
          occurredAt: clickedAt,
          metadata: clickMetadata(metadata),
        },
      }),
      this.prisma.enrollmentStepState.updateMany({
        where: {
          enrollmentId: link.enrollmentId,
          campaignStepId: link.campaignStepId,
        },
        data: {
          clickedAt,
        },
      }),
    ]);

    await this.progress.evaluateEnrollment(link.enrollmentId);

    return link.originalUrl;
  }
}

function clickMetadata(metadata?: ClickMetadata) {
  return {
    ...(metadata?.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
    ...(metadata?.userAgent ? { userAgent: metadata.userAgent } : {}),
  };
}

function assertSafeRedirectUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Tracked link target is not allowed');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Tracked link target is not allowed');
  }
}
