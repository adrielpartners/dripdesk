# Release Checklist

Phase 22 tracks MVP readiness checks.

## Required Automated Checks

Run before release:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm audit
DRIPDESK_DATABASE_URL="postgresql://user:pass@localhost:5432/dripdesk" pnpm --filter @dripdesk/database exec prisma validate
```

## Required Live Smoke Tests

Run with Postgres, Redis, API, worker, and web available:

- apply migrations to a fresh Postgres database
- register owner account and organization
- log in as owner
- create person with channel
- create campaign and published steps
- activate campaign
- enroll person and confirm active-contact limit enforcement
- run scheduler/worker queue path through Redis
- send provider sandbox message for each configured provider
- click tracked link and confirm progress update
- test unsubscribe link end to end
- test recipient login and dashboard access
- test Stripe webhook signature validation with Stripe CLI

## Production Readiness

- set unique production secrets
- configure Stripe price IDs and webhook secret
- set `DRIPDESK_PUBLIC_WEB_URL` and `DRIPDESK_PUBLIC_API_URL` to public HTTPS origins
- leave `DRIPDESK_ENABLE_API_DOCS` unset or false unless API docs should be publicly exposed
- configure provider credentials per organization
- verify CORS origin
- verify reverse proxy/TLS
- configure Postgres backups
- run dependency audit
- review `docs/security-review.md`

## Known Test Gaps

- Docker build was not verified in the current environment.
- Live database/API/worker/provider smoke tests need running once services are available.
- Stripe webhook signature validation still needs live testing with Stripe CLI or a provider sandbox.
