import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { hashUnsubscribeToken, type UnsubscribeAction } from '@dripdesk/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UnsubscribeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(token: string) {
    const record = await this.findUsableToken(token);
    return {
      campaignScoped: Boolean(record.campaignId),
      person: {
        displayName: record.person.displayName,
        status: record.person.status,
      },
      campaign: record.campaign ? { name: record.campaign.name } : null,
    };
  }

  async apply(token: string, action: UnsubscribeAction) {
    const record = await this.findUsableToken(token);
    const now = new Date();

    if (action === 'campaign') {
      if (!record.campaignId || !record.enrollmentId) {
        throw new BadRequestException('This unsubscribe link is not scoped to one campaign');
      }

      await this.prisma.$transaction([
        this.prisma.enrollment.updateMany({
          where: {
            id: record.enrollmentId,
            organizationId: record.organizationId,
            personId: record.personId,
            campaignId: record.campaignId,
            status: 'active',
          },
          data: { status: 'removed', removedAt: now },
        }),
        this.prisma.enrollmentStepState.updateMany({
          where: {
            enrollmentId: record.enrollmentId,
            enrollment: {
              organizationId: record.organizationId,
              personId: record.personId,
              campaignId: record.campaignId,
            },
            status: { in: ['pending', 'queued', 'sent', 'delivered', 'clicked', 'replied', 'failed'] },
          },
          data: { status: 'unsubscribed', unsubscribedAt: now },
        }),
        this.prisma.unsubscribeEvent.create({
          data: {
            organizationId: record.organizationId,
            personId: record.personId,
            campaignId: record.campaignId,
            enrollmentId: record.enrollmentId,
            eventType: 'campaign_unsubscribed',
          },
        }),
        this.prisma.unsubscribeToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      ]);
    }

    if (action === 'global') {
      await this.prisma.$transaction([
        this.prisma.personChannel.updateMany({
          where: { organizationId: record.organizationId, personId: record.personId },
          data: { unsubscribed: true, enabled: false },
        }),
        this.prisma.enrollment.updateMany({
          where: { organizationId: record.organizationId, personId: record.personId, status: 'active' },
          data: { status: 'removed', removedAt: now },
        }),
        this.prisma.enrollmentStepState.updateMany({
          where: {
            enrollment: { organizationId: record.organizationId, personId: record.personId },
            status: { in: ['pending', 'queued', 'sent', 'delivered', 'clicked', 'replied', 'failed'] },
          },
          data: { status: 'unsubscribed', unsubscribedAt: now },
        }),
        this.prisma.unsubscribeEvent.create({
          data: {
            organizationId: record.organizationId,
            personId: record.personId,
            eventType: 'global_unsubscribed',
          },
        }),
        this.prisma.unsubscribeToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      ]);
    }

    if (action === 'delete') {
      await this.prisma.$transaction([
        this.prisma.person.update({
          where: { id: record.personId, organizationId: record.organizationId },
          data: {
            status: 'deletion_requested',
            deletionRequestedAt: now,
          },
        }),
        this.prisma.personChannel.updateMany({
          where: { organizationId: record.organizationId, personId: record.personId },
          data: { unsubscribed: true, suppressed: true, enabled: false },
        }),
        this.prisma.enrollment.updateMany({
          where: { organizationId: record.organizationId, personId: record.personId, status: 'active' },
          data: { status: 'removed', removedAt: now },
        }),
        this.prisma.enrollmentStepState.updateMany({
          where: {
            enrollment: { organizationId: record.organizationId, personId: record.personId },
            status: { in: ['pending', 'queued', 'sent', 'delivered', 'clicked', 'replied', 'failed'] },
          },
          data: { status: 'unsubscribed', unsubscribedAt: now },
        }),
        this.prisma.unsubscribeEvent.create({
          data: {
            organizationId: record.organizationId,
            personId: record.personId,
            eventType: 'deletion_requested',
          },
        }),
        this.prisma.unsubscribeToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      ]);
    }

    return { applied: true, action };
  }

  private async findUsableToken(token: string) {
    const record = await this.prisma.unsubscribeToken.findUnique({
      where: { tokenHash: hashUnsubscribeToken(token) },
      include: { person: true, campaign: true },
    });

    if (!record) throw new NotFoundException('Unsubscribe link not found');
    if (record.usedAt) throw new GoneException('Unsubscribe link has already been used');
    if (record.expiresAt && record.expiresAt <= new Date()) throw new GoneException('Unsubscribe link has expired');
    return record;
  }
}
