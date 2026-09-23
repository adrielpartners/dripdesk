import assert from 'node:assert/strict';
import type { PrismaClient } from '@dripdesk/database';
import type { Job, Queue } from 'bullmq';
import { rotateOrganizations, scheduleDueSteps } from './schedule-due-steps';

const candidate = {
  id: 'step-state-id',
  enrollmentId: 'enrollment-id',
  campaignStepId: 'campaign-step-id',
  stepOrder: 1,
  enrollment: {
    currentStepOrder: 1,
    enrolledAt: new Date('2026-01-01T00:00:00Z'),
    person: {
      timezone: 'UTC',
      channels: [{ channelType: 'email', enabled: true, unsubscribed: false, suppressed: false }],
    },
    campaign: {
      scheduleType: 'daily',
      scheduleConfig: { sendTime: '00:00' },
      defaultChannels: ['email'],
      organization: { defaultTimezone: 'UTC' },
    },
  },
  campaignStep: { channelOverrides: [], delayDaysOverride: 0 },
};

let updateCount = 0;
const client = {
  enrollment: {
    groupBy: async () => [{ organizationId: 'organization-id' }],
  },
  enrollmentStepState: {
    findMany: async () => [candidate],
    updateMany: async () => {
      updateCount += 1;
      return { count: 1 };
    },
  },
} as unknown as PrismaClient;

const queue = {
  addBulk: async () => {
    throw new Error('Redis unavailable');
  },
} as unknown as Queue;

async function run() {
  const organizations = Array.from({ length: 11 }, (_, index) => `org-${index}`);
  const firstCycle = rotateOrganizations(organizations, 10);
  const secondCycle = rotateOrganizations(organizations, 10);
  assert.equal(firstCycle.length, 10);
  assert.equal(secondCycle.length, 10);
  assert.equal(new Set([...firstCycle, ...secondCycle]).size, 11, 'all eligible organizations must eventually get a turn');
  await assert.rejects(
    scheduleDueSteps({ id: 'schedule-test' } as Job, queue, client),
    /Redis unavailable/,
  );
  assert.equal(updateCount, 0, 'a failed queue write must leave the due step pending');
  console.log('schedule-due-steps tests passed');
}

void run();
