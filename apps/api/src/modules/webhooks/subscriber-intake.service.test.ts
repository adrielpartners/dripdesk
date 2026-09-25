import assert from 'assert';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SubscriberIntakeService } from './subscriber-intake.service';
import { SubscriberIntakeDto } from './dto/subscriber-intake.dto';

const organizationId = 'a24bc355-e0ba-4621-aab5-13e2f4855d1f';
const campaignId = 'A1B2C3';
const key = 'ddi_test-secret';
const dto = { eventId: 'signup-1', campaignId, displayName: 'Jordan Lee', email: 'Jordan@Example.com', consent: true as const };

async function run() {
  const falseString = plainToInstance(SubscriberIntakeDto, { ...dto, consent: 'false' }, { enableImplicitConversion: true });
  assert.ok(validateSync(falseString).some((error) => error.property === 'consent'));
  for (const value of [campaignId, campaignId.toLowerCase()]) {
    const validated = plainToInstance(SubscriberIntakeDto, { ...dto, campaignId: value });
    assert.ok(!validateSync(validated).some((error) => error.property === 'campaignId'));
  }
  for (const value of ['ABCDE', 'ABC-12', 'ABCDEFG', '16d50374-51ca-4246-99d5-e041dc9a23fe']) {
    const validated = plainToInstance(SubscriberIntakeDto, { ...dto, campaignId: value });
    assert.ok(validateSync(validated).some((error) => error.property === 'campaignId'));
  }

  let credential: { tokenHash: string } | null = null;
  let event: { payloadHash: string; personId: string; enrollmentId: string } | null = null;
  const channels: Array<{ channelType: string; address: string; personId: string; enabled: boolean; unsubscribed: boolean; suppressed: boolean; person: { id: string; status: string; tags: string[] } }> = [];
  let enrollmentCount = 0;
  let campaignLookup: Record<string, string> = {};
  const tx = {
    subscriberIntakeEvent: {
      findUnique: async () => event,
      create: async ({ data }: { data: typeof event }) => { event = data; },
    },
    campaign: { findFirst: async ({ where }: { where: Record<string, string> }) => {
      campaignLookup = where;
      return { id: campaignId, organizationId, createdById: 'admin-id', status: 'active', defaultChannels: ['email'], steps: [{ channelOverrides: [] }] };
    } },
    personChannel: {
      findMany: async () => channels,
      create: async ({ data }: { data: { personId: string; channelType: string; address: string } }) => {
        channels.push({ ...data, enabled: true, unsubscribed: false, suppressed: false, person: { id: data.personId, status: 'active', tags: [] } });
      },
    },
    person: { create: async () => ({ id: 'person-1', tags: [] }), update: async () => ({}) },
    enrollment: { findUnique: async () => null },
  };
  const prisma = {
    subscriberIntakeCredential: {
      findUnique: async () => credential,
      upsert: async ({ create }: { create: { tokenHash: string } }) => { credential = create; },
    },
    subscriberIntakeEvent: { findUnique: async () => event },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  };
  const enrollments = { createForTenant: async () => { enrollmentCount++; return { id: 'enrollment-1', status: 'active' }; } };
  const service = new SubscriberIntakeService(prisma as never, enrollments as never);

  await assert.rejects(() => service.receive(organizationId, key, dto), ForbiddenException);
  const generated = await service.rotateKey(organizationId);
  assert.ok(generated.key.startsWith('ddi_'));
  await assert.rejects(() => service.receive(organizationId, key, dto), ForbiddenException);

  const first = await service.receive(organizationId, generated.key, dto);
  assert.equal(first.personId, 'person-1');
  assert.equal(first.replayed, false);
  assert.equal(channels[0].address, 'jordan@example.com');
  assert.equal(enrollmentCount, 1);
  assert.equal(campaignLookup.id, campaignId);

  const replay = await service.receive(organizationId, generated.key, dto);
  assert.equal(replay.replayed, true);
  assert.equal(enrollmentCount, 1);
  await assert.rejects(() => service.receive(organizationId, generated.key, { ...dto, displayName: 'Other' }), ConflictException);

  event = null;
  const shortCodeDto = { ...dto, eventId: 'signup-2', campaignId: campaignId.toLowerCase() };
  await service.receive(organizationId, generated.key, shortCodeDto);
  assert.equal(campaignLookup.id, campaignId);
  const shortCodeReplay = await service.receive(organizationId, generated.key, { ...shortCodeDto, campaignId });
  assert.equal(shortCodeReplay.replayed, true);
  assert.equal(enrollmentCount, 2);

  event = null;
  channels[0].unsubscribed = true;
  await assert.rejects(() => service.receive(organizationId, generated.key, dto), ConflictException);
  assert.equal(enrollmentCount, 2);
}

void run().then(() => console.log('subscriber intake tests passed'));
