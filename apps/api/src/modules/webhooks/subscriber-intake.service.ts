import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PersonChannelType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { SubscriberIntakeDto } from './dto/subscriber-intake.dto';

type IntakeChannel = { channelType: PersonChannelType; address: string };

@Injectable()
export class SubscriberIntakeService {
  constructor(private readonly prisma: PrismaService, private readonly enrollments: EnrollmentsRepository) {}

  async settings(organizationId: string) {
    const credential = await this.prisma.subscriberIntakeCredential.findUnique({ where: { organizationId } });
    return { configured: Boolean(credential), createdAt: credential?.createdAt ?? null };
  }

  async rotateKey(organizationId: string) {
    const key = `ddi_${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.hash(key);
    await this.prisma.subscriberIntakeCredential.upsert({
      where: { organizationId },
      create: { organizationId, tokenHash },
      update: { tokenHash },
    });
    return { key, organizationId, warning: 'Save this key now. It will not be displayed again; rotating it invalidates the old key.' };
  }

  async receive(organizationId: string, providedKey: string | undefined, dto: SubscriberIntakeDto) {
    await this.authenticate(organizationId, providedKey);
    const channels = this.channels(dto);
    const eventId = dto.eventId.trim();
    const displayName = dto.displayName.trim();
    if (!eventId || !displayName) throw new BadRequestException('Event ID and display name cannot be blank');
    if (dto.tags && (dto.tags.length > 25 || dto.tags.some((tag) => tag.length > 80))) {
      throw new BadRequestException('Provide at most 25 tags of up to 80 characters each');
    }
    if (dto.timezone) {
      try { Intl.DateTimeFormat('en', { timeZone: dto.timezone }).format(); }
      catch { throw new BadRequestException('Timezone must be a valid IANA timezone'); }
    }

    const payloadHash = this.hash(JSON.stringify({
      campaignId: dto.campaignId, displayName, channels, timezone: dto.timezone?.trim() ?? null,
      tags: dto.tags?.map((tag) => tag.trim()).filter(Boolean).sort() ?? [], consent: dto.consent,
    }));
    const replay = await this.prisma.subscriberIntakeEvent.findUnique({
      where: { organizationId_eventId: { organizationId, eventId } },
    });
    if (replay) return this.replay(replay, payloadHash);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const withinTransaction = await tx.subscriberIntakeEvent.findUnique({
          where: { organizationId_eventId: { organizationId, eventId } },
        });
        if (withinTransaction) return this.replay(withinTransaction, payloadHash);

        const campaign = await tx.campaign.findFirst({
          where: { id: dto.campaignId, organizationId },
          include: { steps: { where: { status: 'published' }, orderBy: { stepOrder: 'asc' }, take: 1 } },
        });
        if (!campaign) throw new NotFoundException('Campaign not found in this organization');
        if (campaign.status !== 'active' || !campaign.steps.length) {
          throw new ConflictException('Campaign must be active with a published step');
        }
        const firstChannels = campaign.steps[0].channelOverrides.length
          ? campaign.steps[0].channelOverrides : campaign.defaultChannels;
        if (!channels.some((channel) => firstChannels.includes(channel.channelType))) {
          throw new BadRequestException('Subscriber needs an email, SMS number, or Telegram chat ID used by the campaign’s first step');
        }

        const matches = await tx.personChannel.findMany({
          where: { organizationId, OR: channels.map((channel) => ({ channelType: channel.channelType, address: channel.address })) },
          include: { person: true },
        });
        const personIds = new Set(matches.map((match) => match.personId));
        if (personIds.size > 1) throw new ConflictException('Provided contact channels belong to different people');
        if (matches.some((match) => !match.enabled || match.unsubscribed || match.suppressed)) {
          throw new ConflictException('A matching contact channel is disabled or opted out');
        }
        const existingPerson = matches[0]?.person;
        if (existingPerson && existingPerson.status !== 'active') {
          throw new ConflictException('This person cannot be enrolled because their contact record is inactive');
        }

        const person = existingPerson ?? await tx.person.create({
          data: { organizationId, displayName, timezone: dto.timezone?.trim() || undefined,
            tags: dto.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [] },
        });
        for (const channel of channels) {
          if (matches.some((match) => match.channelType === channel.channelType && match.address === channel.address)) continue;
          await tx.personChannel.create({ data: { organizationId, personId: person.id, ...channel } });
        }
        if (existingPerson) {
          await tx.person.update({
            where: { id: person.id },
            data: { displayName, ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}),
              ...(dto.tags ? { tags: Array.from(new Set([...person.tags, ...dto.tags.map((tag) => tag.trim()).filter(Boolean)])) } : {}) },
          });
        }

        const existingEnrollment = await tx.enrollment.findUnique({
          where: { personId_campaignId: { personId: person.id, campaignId: campaign.id } },
        });
        if (existingEnrollment && existingEnrollment.status !== 'active' && existingEnrollment.status !== 'removed') {
          throw new ConflictException('Person already has a paused or completed enrollment; manage it in DripDesk');
        }
        const enrollment = existingEnrollment && existingEnrollment.status !== 'removed'
          ? existingEnrollment
          : await this.enrollments.createForTenant(
              { organizationId, userId: campaign.createdById, membershipRole: 'owner' }, campaign.id, person.id, tx,
            );
        await tx.subscriberIntakeEvent.create({
          data: { organizationId, eventId, payloadHash, personId: person.id, enrollmentId: enrollment.id },
        });
        return { personId: person.id, enrollmentId: enrollment.id, enrollmentStatus: enrollment.status,
          created: !existingPerson, alreadyEnrolled: Boolean(existingEnrollment && existingEnrollment.status !== 'removed'), replayed: false };
      }, { timeout: 10000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const recorded = await this.prisma.subscriberIntakeEvent.findUnique({
          where: { organizationId_eventId: { organizationId, eventId } },
        });
        if (recorded) return this.replay(recorded, payloadHash);
        throw new ConflictException('A contact channel was registered concurrently; retry this event');
      }
      throw error;
    }
  }

  private channels(dto: SubscriberIntakeDto): IntakeChannel[] {
    if (dto.consent !== true) throw new BadRequestException('consent must be true');
    const channels: IntakeChannel[] = [];
    if (dto.email) channels.push({ channelType: 'email', address: dto.email.trim().toLowerCase() });
    if (dto.phone) channels.push({ channelType: 'sms', address: dto.phone.trim() });
    if (dto.telegramChatId) channels.push({ channelType: 'telegram', address: dto.telegramChatId.trim() });
    if (!channels.length) throw new BadRequestException('At least one of email, phone, or telegramChatId is required');
    return channels;
  }

  private async authenticate(organizationId: string, providedKey: string | undefined) {
    const credential = await this.prisma.subscriberIntakeCredential.findUnique({ where: { organizationId } });
    const expected = Buffer.from(credential?.tokenHash ?? ''.padEnd(64, '0'), 'hex');
    const actual = Buffer.from(this.hash(providedKey ?? ''), 'hex');
    if (!providedKey || !credential || !timingSafeEqual(expected, actual)) {
      throw new ForbiddenException('Subscriber intake key is missing or invalid');
    }
  }

  private replay(event: { payloadHash: string; personId: string; enrollmentId: string }, payloadHash: string) {
    if (event.payloadHash !== payloadHash) throw new ConflictException('Event ID was already used with different subscriber data');
    return { personId: event.personId, enrollmentId: event.enrollmentId, replayed: true };
  }

  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
