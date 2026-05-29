# Queue and Worker

Phase 11 adds Redis-backed queue infrastructure before message delivery exists.

## Tooling

Queue tooling:

```text
Redis + BullMQ
```

The shared queue is named `dripdesk`.

Shared job names and retry defaults live in `@dripdesk/shared`.

## Jobs

Phase 11 job names:

- `test-job`
- `schedule-due-steps`
- `send-message`
- `process-provider-event`
- `evaluate-progress`
- `cleanup-expired-tokens`

`test-job` verifies the queue path. `schedule-due-steps` performs due-step detection starting in Phase 12. `send-message` prepares durable outbox records and tracked links starting in Phase 13, and sends through configured providers starting in Phase 15. `evaluate-progress` runs shared completion evaluation starting in Phase 14. Other future job names are recognized by the worker and logged as deferred until their implementation phases.

`schedule-due-steps` is registered as a repeatable BullMQ job every 60 seconds.

## API

Admin-only route:

- `POST /queue/test`

Routes require:

```text
JwtAuthGuard
CurrentOrganizationGuard
RolesGuard(owner/admin)
```

The test route enqueues a `test-job` with organization and user context. It exists only to verify the Redis/BullMQ path.

## Worker

The worker entrypoint is:

```bash
pnpm --filter @dripdesk/worker dev
```

For a compiled worker:

```bash
pnpm --filter @dripdesk/worker build
pnpm --filter @dripdesk/worker start
```

The worker:

- connects to Redis from `DRIPDESK_REDIS_URL`
- consumes the `dripdesk` queue
- uses `DRIPDESK_WORKER_CONCURRENCY`
- registers repeatable scheduled jobs
- prepares `send-message` jobs into `message_outbox`
- sends prepared outbox records through Twilio, Telegram, or SMTP when credentials exist
- evaluates progress through `ProgressService`
- logs startup, shutdown, completed jobs, failed jobs, and queue errors
- exits with a visible startup error when Redis is unreachable

## Local Services

Redis is defined in `docker/docker-compose.yml`.

```bash
pnpm docker:up
```

Docker is unavailable in the current environment, so live Redis job processing must be smoke-tested when Docker or another Redis instance is available.

## Deferred

Cleanup behavior and production worker container packaging remain later phases.
