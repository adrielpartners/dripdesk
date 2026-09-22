# Queue and Worker

DripDesk uses Redis and BullMQ for scheduled campaign delivery.

## Tooling

Queue tooling:

```text
Redis + BullMQ
```

The shared queue is named `dripdesk`.

Shared job names and retry defaults live in `@dripdesk/shared`.

## Jobs

Job names:

- `test-job`
- `schedule-due-steps`
- `send-message`
- `process-provider-event`
- `evaluate-progress`
- `cleanup-expired-tokens`

`test-job` verifies the queue path. `schedule-due-steps` detects due steps and enqueues sends before marking each step queued, so a queue write failure leaves the step eligible for another scheduling cycle. `send-message` prepares a durable outbox record, sends through the configured Twilio, Telegram, or SMTP provider, and evaluates enrollment progress after confirmed provider acceptance. A time-based step does not advance merely because it was queued. `evaluate-progress` runs the same progress evaluation separately. `process-provider-event` currently acknowledges queued events; the API handles provider webhooks inline.

Send jobs have deterministic IDs and the outbox has a unique enrollment/step/channel key. A send already marked `sent` is not repeated. If provider acceptance succeeds but database confirmation fails, the outbox remains `sending` for operator inspection rather than automatically retrying a potentially duplicate delivery. Other provider errors are marked `failed` and retried according to the shared queue defaults.

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

Redis and Mailpit are defined in `docker/docker-compose.yml`.

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis mailpit
```

After starting the API and worker containers and applying migrations, run `corepack pnpm smoke:campaign`. It verifies two scheduled SMTP messages and completion against Mailpit. It does not verify an external provider.

## Deferred

Production delivery still needs provider-sandbox tests, operational alerting for uncertain `sending` records, and retry policy review for ambiguous transport failures.
