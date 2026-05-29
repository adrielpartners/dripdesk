import assert from 'node:assert/strict';
import { isStepDue } from './schedule-rules';

const timezone = 'America/New_York';
const enrolledAt = new Date('2026-05-25T13:00:00Z');

function due(overrides: Partial<Parameters<typeof isStepDue>[0]>) {
  return isStepDue({
    scheduleType: 'daily',
    enrolledAt,
    now: new Date('2026-05-26T14:00:00Z'),
    timezone,
    stepOrder: 2,
    ...overrides,
  });
}

assert.equal(due({ scheduleType: 'daily' }), true, 'daily step 2 is due after one local day');
assert.equal(
  due({ scheduleType: 'daily', now: new Date('2026-05-26T12:59:00Z') }),
  false,
  'daily respects local send time',
);
assert.equal(
  due({ scheduleType: 'weekdays', now: new Date('2026-05-30T14:00:00Z') }),
  false,
  'weekdays skip Saturday',
);
assert.equal(
  due({ scheduleType: 'monday_wednesday_friday', now: new Date('2026-05-27T14:00:00Z') }),
  true,
  'monday/wednesday/friday allows Wednesday',
);
assert.equal(
  due({
    scheduleType: 'custom_interval',
    scheduleConfig: { intervalDays: 3 },
    stepOrder: 2,
    now: new Date('2026-05-27T14:00:00Z'),
  }),
  false,
  'custom interval waits for configured day gap',
);
assert.equal(
  due({
    scheduleType: 'custom_days_of_week',
    scheduleConfig: { daysOfWeek: [2, 4] },
    now: new Date('2026-05-28T14:00:00Z'),
  }),
  true,
  'custom days allow configured local weekdays',
);
assert.equal(
  due({
    scheduleType: 'daily',
    delayDaysOverride: 5,
    now: new Date('2026-05-28T14:00:00Z'),
  }),
  false,
  'per-step delay override takes precedence',
);

console.log('schedule-rules tests passed');
