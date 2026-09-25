# Release Checklist

Phase 22 tracks MVP readiness checks. Last reviewed: 2026-09-22. A checked local path does not imply production delivery has been proven.

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
- for the six-character campaign ID release, verify an existing campaign, step, and enrollment keep valid references after migration; verify a new campaign receives a six-character uppercase ID
- verify campaign URLs, admin/recipient views, reports, and subscriber intake use the same ID, including lowercase intake input
- register owner account and organization
- log in as owner
- create person with channel
- create campaign and published steps
- activate campaign
- enroll person and confirm active-contact limit enforcement
- run scheduler/worker queue path through Redis
- run `corepack pnpm smoke:campaign` against the local Mailpit stack
- rotate an organization intake key, save its one-time value securely, and POST a consenting test subscriber with a unique `eventId` to `/api/webhooks/subscribers/:organizationId`
- verify the intake response, person/contact details, enrollment, scheduled step, outbox, and message events for the intended campaign
- retry the identical intake event and confirm the original result is returned without a duplicate person, enrollment, or send; verify a changed payload with the same `eventId` conflicts
- verify both email and SMS provider results for the live test contact, and confirm later steps fire on schedule; provider acceptance alone is not final delivery confirmation
- send provider sandbox message for each configured provider
- click tracked link and confirm progress update
- test unsubscribe link end to end
- test recipient login and dashboard access
- test Stripe webhook signature validation with Stripe CLI

## Production Readiness

- set unique production secrets
- configure Stripe price IDs and webhook secret
- set `DRIPDESK_PUBLIC_WEB_URL` and `DRIPDESK_PUBLIC_API_URL` to public HTTPS origins for the API and worker
- set `NUXT_PUBLIC_WEB_URL` to the public web origin and `NUXT_PUBLIC_API_URL` to the public API base, including its `/api` path, for the web container
- leave `DRIPDESK_ENABLE_API_DOCS` unset or false unless API docs should be publicly exposed
- configure provider credentials per organization
- verify CORS origin
- verify API failures show the user-facing explanation for their error code, rather than a raw request error
- verify reverse proxy/TLS
- configure Postgres backups
- run dependency audit
- triage current audit advisories and document upgrade or risk decisions; do not treat a nonzero audit as passed
- review `docs/security-review.md`

## Known Test Gaps

- Local Docker web/API/worker builds and a two-step SMTP-to-Mailpit campaign were verified on 2026-09-22. The local smoke created a campaign, enrolled a contact, sent two messages to Mailpit through the queue/worker, and completed the enrollment.
- The production campaign is active and SMTP/Twilio test jobs were accepted, but no production subscriber-intake-to-campaign run or final provider delivery has been verified. Live Telegram and external provider delivery checks remain open.
- Stripe webhook signature validation still needs live testing with Stripe CLI or a provider sandbox.
- The new API/worker Dockerfiles include OpenSSL and use a `.node` native query-engine filename; verify a rebuilt API image can run `prisma -v` and `prisma migrate deploy` before applying `20260923000001_session_version`. Existing bearer tokens will need a new login after that release.
- The 2026-09-23 audit still found 58 advisories overall, including 2 critical; production dependency graph audit found 49, including 2 critical. See `docs/security-review.md` for scope and triage guidance.
- ESLint now runs across all six workspaces, and CI gates image publishing on lint, typecheck, and Node test-runner results. Coverage is reported but no minimum threshold is enforced. `DRIPDESK_E2E_ALLOW_DATA_WRITES=true pnpm --filter @dripdesk/api test:e2e` now includes cross-tenant access and logout checks and creates two test accounts/organizations; run it only against an isolated non-production database/Redis stack. It has not yet been run against a healthy stack. External SMTP/Twilio delivery tests also remain open.
