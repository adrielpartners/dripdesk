# Scheduling Engine

Phase 12 determines which enrollment steps are due and enqueues delivery jobs.

## Scope

The scheduler runs in `apps/worker` through the repeatable `schedule-due-steps` BullMQ job.

It finds active enrollments whose current enrollment step state is `pending`, evaluates the campaign schedule, claims due states as `queued`, and enqueues `send-message` jobs.

Phase 13 consumes `send-message` jobs into prepared outbox records and tracked links. Phase 14 evaluates time-based completion after message preparation. Provider sends and provider events remain later phases.

## Schedule Rules

Supported campaign schedule templates:

- `daily`
- `weekdays`
- `monday_wednesday_friday`
- `custom_interval`
- `custom_days_of_week`

Schedule config supports:

- `sendTime`, defaulting to `09:00`
- `intervalDays` for custom interval
- `daysOfWeek` for custom days of week, using `0` for Sunday through `6` for Saturday

Per-step `delayDaysOverride` takes precedence over the campaign schedule interval.

## Timezone

Due checks use:

```text
person.timezone
→ organization.default_timezone
```

The scheduler compares local day and local send time in that timezone.

## Duplicate Prevention

Phase 12 uses two duplicate guards:

- `enrollment_step_states.status` moves from `pending` to `queued` when the scheduler claims a due step.
- `send-message` jobs use deterministic BullMQ job IDs:

```text
send-message:{enrollmentId}:{campaignStepId}:{channel}
```

Phase 13 adds durable `message_outbox` records that provide stronger per-channel duplicate prevention after scheduler enqueueing.

## Campaign Setup

Admin campaign setup can persist schedule config for custom interval and custom days-of-week schedules.

## Tests

Schedule rule tests live at:

```text
apps/worker/src/scheduling/schedule-rules.test.ts
```

Run with:

```bash
pnpm --filter @dripdesk/worker test
```
