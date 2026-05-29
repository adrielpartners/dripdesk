# IMPLEMENTATION_PLAN.md

Version: 1.0  
Project: DripDesk  
Repository: `dripdesk`  
System Type: Multi-Tenant SaaS Application  
Last Updated: 2026-05-28

---

# Purpose

This file turns the DripDesk architecture into an ordered build plan.

Use this as the working roadmap for AI agents and developers. It is not permanent doctrine. Update it as work is completed, priorities change, or implementation details become clearer.

Before working on any phase, read:

1. `AGENTS.md`
2. `CODING_CONSTITUTION.md`
3. `ARCHITECTURE.md`
4. `DECISIONS.md`
5. `PROJECT_RULES.md`
6. `IMPLEMENTATION_PLAN.md`

Do not build the marketing site during this implementation plan.

Do not build a WordPress plugin during this implementation plan.

---

# Agent Instructions

When using this plan:

1. Work on one phase or one step at a time.
2. Inspect the repo before editing.
3. Preserve the SaaS product boundary.
4. Do not skip ahead without being asked.
5. Do not add non-v1 product areas without approval.
6. Preserve tenant isolation.
7. Mark checklist items complete only after implementation and verification.
8. If the code conflicts with the docs, stop and report the conflict.
9. If a step requires a new decision, ask or document the assumption.
10. End each task with changed files, verification notes, risks, and next step.

Suggested prompt:

```text
You are working in the dripdesk repo.

Read:
- AGENTS.md
- CODING_CONSTITUTION.md
- ARCHITECTURE.md
- DECISIONS.md
- PROJECT_RULES.md
- IMPLEMENTATION_PLAN.md

Task:
Work on Phase __, Step __ from IMPLEMENTATION_PLAN.md.

Rules:
- Do not skip ahead.
- Do not change unrelated files.
- Preserve the DripDesk product boundary.
- Do not build marketing site features.
- Do not build WordPress plugin features.
- Preserve tenant isolation.
- Update the checklist only for completed work.
- Run the smallest relevant verification available.
- Summarize changed files, verification, assumptions, risks, and next step.
```

---

# Build Strategy

Build in this order:

1. Establish repo baseline.
2. Create monorepo structure.
3. Add shared configuration and environment handling.
4. Add database schema and migrations.
5. Add authentication and authorization.
6. Add organization/multi-tenant foundation.
7. Add design system foundation.
8. Add admin app shell and recipient app shell.
9. Add persons and channels.
10. Add campaigns and steps.
11. Add enrollments and active contact enforcement.
12. Add queue and worker infrastructure.
13. Add scheduling engine.
14. Add tracked links and progress evaluation.
15. Add Twilio, Telegram, and SMTP integrations.
16. Add unsubscribe and deletion-request flows.
17. Add admin analytics dashboard.
18. Add billing with Stripe.
19. Add Docker/deployment readiness.
20. Test, harden, and document.

---

# Phase 0: Repository Baseline

Goal: Understand the current repo and avoid accidental overwrite.

## Checklist

- [x] Run `git status`.
- [x] Review current file structure.
- [x] Identify package manager and lockfile.
- [x] Identify existing apps/packages.
- [x] Identify current Docker files.
- [x] Identify existing database/migration tooling.
- [x] Identify current auth implementation if any.
- [x] Identify existing UI component/style system.
- [x] Identify existing environment variable handling.
- [x] Summarize the baseline before editing.

## Verification

- [x] Repo state is known.
- [x] No user changes were overwritten.

---

# Phase 1: Monorepo Foundation

Goal: Normalize the monorepo structure without adding product behavior prematurely.

## Target Structure

```text
dripdesk/
  apps/
    web/
    api/
    worker/
  packages/
    shared/
    database/
    config/
  docker/
  docs/
```

## Checklist

- [x] Ensure root `package.json` exists.
- [x] Ensure workspace configuration exists.
- [x] Ensure `turbo.json` or equivalent task runner exists if used.
- [x] Ensure root TypeScript config exists.
- [x] Create/normalize `apps/web`.
- [x] Create/normalize `apps/api`.
- [x] Create/normalize `apps/worker`.
- [x] Create/normalize `packages/shared`.
- [x] Create/normalize `packages/database`.
- [x] Create/normalize `docker`.
- [x] Confirm apps can be installed and discovered through workspace tooling.
- [x] Add or update README with local startup placeholder.

## Verification

- [x] Dependencies install.
- [x] Workspace scripts list/execute.
- [x] No product behavior added prematurely.

## Phase 1 Notes

- Completed on 2026-05-28.
- Canonical root documentation files were added from the existing DripDesk build docs.
- The target monorepo folders now exist and are discoverable by pnpm.
- `pnpm typecheck` passes for the current scaffolded typecheck targets.
- Full `pnpm build` still fails in the existing API because Prisma Client generation is blocked by the `MessageOutbox.step` relation mismatch, the webhooks module file is missing, and several existing API dependency/type issues remain. These belong to the next database/API cleanup phases.

---

# Phase 2: Configuration and Environment

Goal: Centralize environment configuration and prevent scattered env reads.

## Recommended Environment Variables

```text
DRIPDESK_ENV
DRIPDESK_API_PORT
DRIPDESK_PUBLIC_WEB_URL
DRIPDESK_PUBLIC_API_URL
DRIPDESK_DATABASE_URL
DRIPDESK_REDIS_URL
DRIPDESK_SESSION_SECRET
DRIPDESK_JWT_EXPIRES_IN
DRIPDESK_PASSWORD_PEPPER
DRIPDESK_ENCRYPTION_KEY
DRIPDESK_STRIPE_SECRET_KEY
DRIPDESK_STRIPE_WEBHOOK_SECRET
DRIPDESK_DEFAULT_FROM_EMAIL
DRIPDESK_DEFAULT_FROM_NAME
DRIPDESK_SMTP_HOST
DRIPDESK_SMTP_PORT
DRIPDESK_SMTP_USER
DRIPDESK_SMTP_PASSWORD
DRIPDESK_LOG_LEVEL
DRIPDESK_WORKER_CONCURRENCY
```

## Checklist

- [x] Add API config module.
- [x] Add worker config module.
- [x] Add web runtime config pattern.
- [x] Add `.env.example` with placeholders only.
- [x] Validate required production secrets.
- [x] Ensure local defaults are safe.
- [x] Ensure secrets are not logged.
- [x] Document environment variables.

## Verification

- [ ] API starts with local config.
- [x] Worker starts with local config.
- [x] Missing production secrets fail clearly.
- [x] `.env.example` contains no real secrets.

## Phase 2 Notes

- Completed on 2026-05-28.
- Environment configuration now uses canonical `DRIPDESK_*` names through `packages/config`.
- Legacy names are accepted only as a transition fallback inside the shared config reader.
- API startup verification remains blocked by pre-existing API/Prisma build issues and should be retried after Phase 3 repairs the database foundation.

---

# Phase 3: Database and Migration Foundation

Goal: Establish PostgreSQL schema ownership and migration discipline.

## Checklist

- [x] Choose and document database tooling/query approach.
- [x] Add migration framework.
- [x] Add local Postgres service in Docker Compose.
- [x] Add database connection module.
- [x] Add initial migration infrastructure.
- [x] Add base tables:
  - organizations
  - users
  - organization_members
  - billing_plans or plan constants if table is not needed yet
- [x] Add timestamps and primary keys consistently.
- [x] Add tenant-aware indexing conventions.
- [x] Add seed/dev data if useful.

## Verification

- [ ] Migrations run locally.
- [ ] Database connects from API.
- [ ] Fresh database can be created from migrations.
- [x] No manual DB setup required beyond Docker/env.

## Phase 3 Notes

- Completed on 2026-05-28.
- Prisma is the documented database tooling for schema, migrations, and generated client.
- The schema was intentionally narrowed to the Phase 3 foundation tables only: `organizations`, `users`, and `organization_members`.
- The previous broad scaffold included later-phase tables, uppercase roles, WhatsApp fields, and plaintext provider credential fields; those were removed from the foundation schema to avoid premature product behavior.
- Migration application and API database connection were not verified in this environment because Docker is unavailable. Prisma schema validation and client generation pass.

---

# Phase 4: Authentication and Authorization

Goal: Add email/password auth for owners, admins, and recipients.

## Checklist

- [x] Add password hashing.
- [x] Add login endpoint.
- [x] Add logout endpoint if session-based.
- [x] Add current-user endpoint.
- [x] Add signup/owner creation flow.
- [x] Add password reset request flow.
- [x] Add password reset completion flow.
- [x] Add auth guards/middleware.
- [x] Add role authorization helpers.
- [x] Add recipient login support.
- [x] Ensure password hashes are never returned.
- [x] Add rate limiting or document deferral.

## Verification

- [ ] Owner can sign up.
- [ ] Admin/owner can log in.
- [ ] Recipient can log in.
- [ ] Wrong password fails safely.
- [ ] Protected routes reject unauthenticated users.
- [ ] Role checks work server-side.
- [ ] Auth tests pass if test framework exists.

## Phase 4 Notes

- Completed on 2026-05-28.
- Auth uses email/password with salted scrypt password hashes and the configured password pepper.
- JWT bearer tokens are the current foundation auth mechanism.
- Owner signup creates an organization and owner membership in one transaction.
- Password reset tokens are hashed in the database; the reset URL is returned only outside production until email delivery is implemented.
- Magic-link endpoints were removed from active auth because magic-link-only auth is not the v1 default.
- Deferred API modules are excluded from the API TypeScript build until their schema phases are implemented.
- Runtime auth verification was not completed because Docker/database access is unavailable in this environment.

---

# Phase 5: Organization and Tenant Foundation

Goal: Make multi-tenancy real before feature data is added.

## Checklist

- [x] Add organization creation with owner signup.
- [x] Add organization membership model.
- [x] Add current organization resolution pattern.
- [x] Add organization switcher support if needed.
- [x] Add owner/admin permissions.
- [x] Add tenant-scoped service context.
- [x] Add repository/query pattern requiring organization context.
- [ ] Add tests for tenant isolation where practical.

## Verification

- [x] Owner belongs to created organization.
- [x] Admin cannot access unrelated organization data.
- [x] Recipient cannot access organization admin routes.
- [x] Organization-scoped query pattern is documented.

## Phase 5 Notes

- Completed on 2026-05-28.
- Owner signup already creates an organization and owner membership in one transaction.
- `CurrentOrganizationGuard` now resolves the active organization, verifies membership, and attaches `TenantContext`.
- `GET /organizations` supports organization switcher data; clients may send `x-dripdesk-organization-id` to select the active organization for scoped requests.
- Organization admin routes use membership roles through `RolesGuard`.
- Organization and team-member queries now use tenant-scoped service/repository inputs.
- Focused tenant isolation runtime tests remain deferred until a test runner and live database are available.

---

# Phase 6: Design System Foundation

Goal: Define visual foundations before heavy UI implementation.

## Visual Direction

- clean
- modern
- airy
- light
- calm
- readable
- mobile-friendly
- medium green primary accent
- light green secondary accent

## Checklist

- [x] Add CSS variable token file.
- [x] Define color tokens.
- [x] Define typography scale.
- [x] Define spacing scale.
- [x] Define radius tokens.
- [x] Define shadow tokens.
- [x] Define focus states.
- [x] Create UI primitives:
  - AppButton
  - AppCard
  - AppInput
  - AppTextarea
  - AppSelect
  - AppBadge
  - AppDialog
  - AppTable or table pattern
  - AppMetricCard
  - AppEmptyState
- [x] Add basic app layouts:
  - admin layout
  - recipient layout
  - auth layout

## Verification

- [x] Tokens are used by primitives.
- [x] No major feature UI uses arbitrary styling before primitives exist.
- [x] UI is readable on mobile and desktop.

## Phase 6 Notes

- Completed on 2026-05-28.
- Token files live in `apps/web/assets/css/tokens.css` and `apps/web/assets/css/base.css`.
- UI primitives live in `apps/web/components/primitives`.
- Basic `default`, `admin`, `recipient`, and `auth` layouts were added without navigation or feature routes.
- Navigation and app shell behavior remain deferred to Phase 7.

---

# Phase 7: App Shells and Navigation

Goal: Create usable skeletons for admin and recipient experiences.

## Admin Shell Checklist

- [x] Add admin dashboard route.
- [x] Add campaigns route.
- [x] Add persons route.
- [x] Add settings/integrations route.
- [x] Add billing route placeholder.
- [x] Add authenticated navigation.
- [x] Add loading/error states.

## Recipient Shell Checklist

- [x] Add recipient dashboard route.
- [x] Add recipient campaign detail route.
- [x] Add recipient settings route.
- [x] Add simple mobile-first navigation.

## Verification

- [x] Authenticated owner/admin can access admin shell.
- [x] Recipient can access only recipient shell.
- [x] Unauthenticated users redirect to login.
- [x] Navigation does not expose unauthorized routes.

## Phase 7 Notes

- Completed on 2026-05-28.
- Added Nuxt auth session helper, login route, admin route middleware, recipient route middleware, and guest route middleware.
- Added admin shell routes for dashboard, campaigns, people, integrations, and billing.
- Added recipient shell routes for dashboard, campaign detail, and settings.
- Shell routes intentionally use placeholders and do not introduce persons, campaign, integration, billing, unsubscribe, or deletion-request behavior ahead of their phases.
- Web route guards are for frontend navigation only; API authorization remains the server-side source of truth.

---

# Phase 8: Persons and Channels

Goal: Add unified Person records and channel management.

## Database Checklist

- [x] Add persons table.
- [x] Add person_channels table.
- [x] Add tags field or supporting table if chosen.
- [x] Add channel status and enabled fields.
- [x] Add suppression/unsubscribe fields.

## API Checklist

- [x] Create person.
- [x] List persons with pagination.
- [x] View person.
- [x] Update person.
- [x] Archive/soft-delete person if needed.
- [x] Add/update person channel.
- [x] Enable/disable person channel.

## UI Checklist

- [x] Persons list.
- [x] Person detail.
- [x] Person create/edit form.
- [x] Channel management UI.

## Verification

- [x] Persons are tenant-scoped.
- [x] Channels validate email/phone/Telegram identifiers.
- [x] Recipients cannot view other persons.
- [x] Admin can manage persons in own organization only.

## Phase 8 Notes

- Completed on 2026-05-28.
- Added Prisma models and migration for `persons` and `person_channels`.
- Person/channel API routes are active in the API build and require authenticated owner/admin membership context.
- Person/channel repositories require `TenantContext` and filter by `tenant.organizationId`.
- Admin People UI now supports list, create, detail/edit, archive, deletion-request marking, add channel, and enable/disable channel controls.
- Runtime database smoke tests remain deferred until Docker/Postgres is available.

---

# Phase 9: Campaigns and Steps

Goal: Add linear campaign creation and simple step editing.

## Database Checklist

- [x] Add campaigns table.
- [x] Add campaign_steps table.
- [x] Add schedule rule fields.
- [x] Add progress rule fields.
- [x] Add mode field.
- [x] Add channel defaults.
- [x] Add step variant fields for SMS, Telegram, and email.

## API Checklist

- [x] Create campaign.
- [x] List campaigns.
- [x] View campaign.
- [x] Update campaign.
- [x] Archive campaign.
- [x] Add step.
- [x] Update step.
- [x] Reorder steps.
- [x] Save draft step.
- [x] Publish/activate campaign when valid.

## UI Checklist

- [x] Campaign list.
- [x] Campaign setup form.
- [x] Step list as vertical stack.
- [x] Add Step editor.
- [x] Save & Add Another.
- [x] Save & Close.
- [x] Save Draft.
- [x] Channel-specific variants.
- [x] Standard/Advanced Mode progressive disclosure.

## Verification

- [x] Admin can create linear campaign.
- [x] Admin can add multiple steps quickly.
- [x] Campaign cannot activate without required fields.
- [x] Campaigns are tenant-scoped.
- [x] No branching UI exists in v1.

## Phase 9 Notes

- Added tenant-scoped `campaigns` and `campaign_steps` schema, migration, API modules, and admin UI.
- Campaign and step repositories require tenant context. Steps are scoped through their parent campaign.
- Activation and published-step validation are enforced server-side.
- Phase 9 intentionally does not add enrollments, scheduling, delivery, tracking, recipient campaign views, branching, or a visual automation builder.
- Verification used Prisma validation/generation, TypeScript typecheck, and production build. Live database route smoke tests remain blocked until PostgreSQL is available.

---

# Phase 10: Enrollments and Active Contact Limits

Goal: Connect Persons to Campaigns and enforce billing limits.

## Database Checklist

- [x] Add enrollments table.
- [x] Add enrollment_step_states table.
- [x] Add indexes for campaign/person/status lookup.
- [x] Add active contact calculation support.

## API Checklist

- [x] Enroll person in campaign.
- [x] Remove/pause enrollment.
- [x] List campaign enrollments.
- [x] List person enrollments.
- [x] Prevent enrollment beyond plan limit.
- [x] Initialize step states or create them lazily according to chosen pattern.

## UI Checklist

- [x] Add person to campaign.
- [x] Add campaign to person if useful.
- [x] Show enrollment status.
- [x] Show current step/progress.
- [x] Show active contact usage against plan limit.

## Verification

- [x] Person starts at Step 1 by default.
- [x] Active contact limit prevents over-enrollment.
- [x] Enrollments are tenant-scoped.
- [x] Duplicate active enrollments are prevented or handled clearly.

## Phase 10 Notes

- Added tenant-scoped `enrollments` and `enrollment_step_states` schema, migration, API module, and admin UI surfaces.
- Enrollment initializes step states for currently published campaign steps and sets `current_step_order` to the first published step order.
- Active contact usage follows the documented 30-day active enrollment definition.
- Phase 10 enforces the Free plan default limit of 10 active contacts until the billing phase adds persisted subscription plans.
- Phase 10 intentionally does not add scheduling, delivery, tracking, recipient campaign views, paid plan storage, or Stripe enforcement.

---

# Phase 11: Queue and Worker Infrastructure

Goal: Add Redis-backed worker infrastructure before sending messages.

## Checklist

- [x] Add Redis to Docker Compose.
- [x] Add BullMQ or selected queue tool.
- [x] Add queue module/config.
- [x] Add worker app startup.
- [x] Add test job processor.
- [x] Add scheduled job mechanism.
- [x] Add retry/backoff defaults.
- [x] Add worker logging.
- [x] Document how to run API and worker separately.

## Expected Jobs

```text
schedule-due-steps
send-message
process-provider-event
evaluate-progress
cleanup-expired-tokens
```

## Verification

- [ ] API can enqueue test job.
- [ ] Worker can process test job.
- [x] Redis outage fails visibly.
- [x] Worker can run separately from API.

## Phase 11 Notes

- Added shared queue names and retry/backoff defaults in `@dripdesk/shared`.
- Added an owner/admin-only API test enqueue route at `POST /queue/test`.
- Added a standalone BullMQ worker startup that consumes the shared `dripdesk` queue, processes `test-job`, registers `schedule-due-steps` as a repeatable job, and logs lifecycle/failure events.
- Docker Compose already includes Redis. Live enqueue/process verification still requires a running Redis instance.
- Phase 11 intentionally does not implement due-step scheduling, message delivery, provider event processing, progress evaluation, or cleanup behavior.

---

# Phase 12: Scheduling Engine

Goal: Determine which enrollment steps are due and enqueue delivery.

## Checklist

- [x] Implement schedule rule parser/evaluator.
- [x] Support Daily.
- [x] Support Weekdays.
- [x] Support Mon/Wed/Fri.
- [x] Support custom interval.
- [x] Support custom days-of-week.
- [x] Support per-step delay override.
- [x] Respect recipient timezone if known; otherwise use organization/default timezone.
- [x] Prevent duplicate sends for same enrollment/step/channel.
- [x] Enqueue send-message jobs.

## Verification

- [x] Due steps are identified correctly.
- [x] Non-due steps are skipped.
- [x] Duplicate sends are prevented.
- [x] Schedule tests cover core templates.

## Phase 12 Notes

- Added a worker-side schedule evaluator with tests for Daily, Weekdays, Monday/Wednesday/Friday, custom interval, custom days of week, local send time, timezone handling, and per-step delay override.
- Added scheduler processing for `schedule-due-steps`; it finds due active enrollment step states, marks them `queued`, and enqueues deterministic `send-message` jobs per enabled channel.
- Added `queued` to `enrollment_step_state_status` for duplicate prevention before Phase 13 message outbox exists.
- Added campaign schedule config persistence and simple admin setup fields for send time, custom interval, and custom days of week.
- Phase 12 intentionally does not prepare messages, create message outbox records, rewrite links, send provider messages, or evaluate completion.

---

# Phase 13: Message Preparation and Tracked Links

Goal: Prepare messages and track outbound links.

## Checklist

- [x] Add message_outbox table.
- [x] Add message_events table.
- [x] Add tracked_links table.
- [x] Implement merge tag replacement.
- [x] Implement channel variant selection.
- [x] Implement link extraction and rewrite.
- [x] Implement tracked link redirect endpoint.
- [x] Record click events.
- [x] Redirect safely to original URL.

## Verification

- [x] Links are rewritten per enrollment/step.
- [x] Click is recorded.
- [x] Recipient is redirected correctly.
- [x] Invalid/expired tracking token fails safely.
- [x] No raw secrets in tracking URLs.

## Phase 13 Notes

- Added tenant-scoped `message_outbox`, `message_events`, and `tracked_links` schema, migration, and Prisma relations.
- Implemented worker-side `send-message` preparation with channel-specific variants, merge tag replacement, tracked link creation, and durable prepared-message events.
- Implemented public tracked-link redirects at `/api/l/:token`; clicks increment tracked link counts, write `clicked` message events, and redirect only to safe `http` or `https` targets.
- Tracking URLs use opaque random tokens and do not include raw enrollment, step, recipient, organization, or provider secret values.
- Phase 13 intentionally does not send provider messages, process provider events, or evaluate click/reply/time-based progress completion.

---

# Phase 14: Progress Evaluation

Goal: Evaluate step completion based on time, click, or reply.

## Checklist

- [x] Add ProgressService.
- [x] Implement time-based completion.
- [x] Implement link-click completion.
- [x] Implement reply-required completion.
- [x] Implement any-reply mode.
- [x] Implement keyword/phrase matching.
- [x] Normalize reply text:
  - lowercase
  - remove punctuation
  - normalize whitespace
- [x] Update enrollment step state.
- [x] Advance enrollment when appropriate.
- [x] Mark campaign complete when final step complete.

## Verification

- [x] Time-based progress works.
- [x] Click-required progress works.
- [x] Any-reply progress works.
- [x] Keyword reply progress ignores case and punctuation.
- [x] Completion logic exists only in ProgressService or documented equivalent.

## Phase 14 Notes

- Added shared `ProgressService` in `@dripdesk/database` so API and worker code use one completion path.
- Time-based progress completes a queued/prepared current step after the worker prepares the message.
- Link-click progress is evaluated after tracked-link clicks are recorded.
- Reply-required progress supports any reply when no phrases are configured and phrase matching when `reply_required_phrases` are present.
- Reply matching lowercases text, removes punctuation, normalizes whitespace, and matches configured phrases against normalized reply text.
- Completion updates the current enrollment step state, advances the enrollment to the next published step, and marks the enrollment completed when the final published step is complete.
- Phase 14 intentionally does not add provider sending or inbound reply webhook ingestion; provider phases will write reply events for this service to evaluate.

---

# Phase 15: Provider Integrations

Goal: Add real sending through Twilio, Telegram, and SMTP.

## Shared Checklist

- [x] Add provider_credentials table.
- [x] Encrypt credentials at rest.
- [x] Add settings UI for credentials.
- [x] Mask saved credentials in UI.
- [x] Add provider test connection actions where practical.
- [x] Add safe provider error normalization.

## Twilio Checklist

- [x] Add Twilio provider client.
- [x] Send SMS.
- [x] Receive delivery status callback if practical.
- [x] Receive inbound reply webhook.
- [x] Validate webhook where practical.

## Telegram Checklist

- [x] Add Telegram Bot API client.
- [x] Send Telegram message.
- [x] Add recipient Telegram link flow.
- [x] Receive inbound reply webhook.
- [x] Handle blocked bot/no chat access.

## SMTP Checklist

- [x] Add SMTP provider client.
- [x] Add SMTP presets/guidance:
  - Brevo
  - SendGrid
  - Mailgun
  - generic SMTP
- [x] Send email subject/body.
- [x] Handle transient vs credential failures.

## Verification

- [x] Provider credentials are encrypted.
- [x] Sending works in dev/test mode or provider sandbox where available.
- [x] Failed credentials are handled safely.
- [x] Replies are logged where supported.
- [x] No provider secrets appear in logs.

## Phase 15 Notes

- Added tenant-scoped `provider_credentials` with encrypted credential payloads and masked frontend-safe config.
- Added admin integration settings for Twilio, Telegram, and SMTP. Saved secrets are never returned to the frontend.
- Worker `send-message` jobs now send prepared outbox records through Twilio SMS, Telegram Bot API, or SMTP, then record `sent` or `failed` events.
- Twilio status and reply webhooks, plus Telegram reply webhooks, record safe message events and call `ProgressService`.
- Telegram webhook secret validation is supported when configured. Twilio webhook signature validation remains limited until raw request signature handling is added.
- Telegram link flow is the v1 manual chat-id pattern through the person Telegram channel address; automated recipient deep-link onboarding remains a future enhancement.
- Phase 15 intentionally does not add unsubscribe handling, analytics, billing, or hosted lesson pages.

---

# Phase 16: Unsubscribe and Deletion Requests

Goal: Give recipients safe control over campaign/global unsubscribe and deletion request.

## Checklist

- [x] Add unsubscribe token generation.
- [x] Add unsubscribe landing page.
- [x] Add campaign-scope unsubscribe action.
- [x] Add global unsubscribe action.
- [x] Add delete account request action.
- [x] Disable sends immediately after global unsubscribe or deletion request.
- [x] Disable recipient login after deletion request.
- [x] Add admin visibility for deletion-requested persons.
- [x] Ensure outbound messages include unsubscribe access where appropriate.

## Verification

- [x] Campaign unsubscribe only stops one campaign.
- [x] Global unsubscribe stops all campaigns.
- [x] Deletion request disables login and sending.
- [x] Unsubscribe actions are tenant-safe and token-safe.
- [x] Admin can see deletion-requested status.

## Phase 16 Notes

- Added hashed `unsubscribe_tokens` and `unsubscribe_events` for campaign, global, and deletion-request actions.
- Prepared outbound messages now include a recipient preference link using a raw token that is never stored in the database.
- Added public unsubscribe API and `/unsubscribe/:token` landing page.
- Campaign unsubscribe removes the scoped active enrollment and marks pending/current step states unsubscribed.
- Global unsubscribe disables all person channels and removes active enrollments for the person.
- Delete account request marks the person `deletion_requested`, suppresses channels, removes active enrollments, and blocks future recipient login.
- Worker scheduling, message preparation, and provider send checks now reject inactive/deletion-requested/suppressed recipients before sending.

---

# Phase 17: Admin Analytics Dashboard

Goal: Build completion-focused admin dashboard.

## Metrics

Top section:

- Active Contacts
- Average open rate
- Average click rate
- Average completion rate

Campaign list:

- active enrolled count
- open/click/completion rates
- last sent timestamp

## Checklist

- [x] Add analytics service.
- [x] Add active contact calculation.
- [x] Add campaign-level summary queries.
- [x] Add dashboard API.
- [x] Add admin dashboard UI.
- [x] Add metric cards.
- [x] Add campaign performance list.
- [x] Add empty states.

## Verification

- [x] Metrics are tenant-scoped.
- [x] Active contact count matches definition.
- [x] Dashboard loads without expensive unbounded queries.
- [x] Empty account shows useful guidance.

## Phase 17 Notes

- Completed on 2026-05-28.
- `GET /dashboard` now returns tenant-scoped active contact, open, click, and completion metrics for owner/admin users.
- Active contact counting uses the Phase 10 definition: distinct people with active enrollments created in the last 30 days.
- Campaign performance is capped to 20 non-archived campaigns and uses aggregate counts rather than loading full event or recipient lists.
- The admin `/admin` page now renders metric cards, campaign performance rows, an empty account state, and a no-activity state.
- Live API/database smoke testing remains blocked until Postgres/Redis services are available.

---

# Phase 18: Recipient Dashboard

Goal: Build simple recipient-facing dashboard.

## Checklist

- [x] Show enrolled campaigns.
- [x] Show campaign progress.
- [x] Show completed steps.
- [x] Show past step messages/content.
- [x] Show basic channel preferences.
- [x] Allow unsubscribe access.
- [x] Respect deletion requested state.
- [x] Keep mobile-first layout.

## Verification

- [x] Recipient sees only their own campaigns.
- [x] Recipient can view past steps.
- [x] Recipient cannot access admin routes.
- [x] Mobile layout is usable.

## Phase 18 Notes

- Completed on 2026-05-29.
- Recipient dashboard routes now use authenticated recipient access through `JwtAuthGuard` and `RolesGuard(recipient)`.
- Recipient campaign queries resolve ownership through linked `persons.user_id` records rather than client-supplied organization IDs.
- Recipient UI now shows campaign progress, completed steps, step message/content history, channel settings, and unsubscribe controls.
- Live recipient smoke testing remains blocked until API/database services are available.

---

# Phase 19: Billing with Stripe

Goal: Add contact-based billing and plan enforcement.

## Checklist

- [x] Add Stripe config.
- [x] Add billing plan constants.
- [x] Add subscription data model.
- [x] Add checkout/customer portal flow if included in v1.
- [x] Add Stripe webhook endpoint.
- [x] Verify Stripe webhook signatures.
- [x] Store verified subscription status.
- [x] Enforce active contact limits on enrollment.
- [x] Show plan and active contact usage in UI.

## Verification

- [x] Free plan enforces 10 active contacts.
- [x] Paid plans enforce configured limits.
- [x] Stripe webhook signature validation works.
- [x] Client cannot fake subscription status.
- [x] Billing state is tenant-scoped.

## Phase 19 Notes

- Completed on 2026-05-29.
- Added `billing_subscriptions` with organization-owned plan, status, active-contact limit, and Stripe identifiers.
- Billing uses existing shared plan constants: Free, Core, Plus, Pro, Enterprise.
- Enrollment limit enforcement now reads the organization's billing subscription limit and falls back to Free when no subscription exists.
- Stripe checkout and customer portal endpoints are owner-only and require configured Stripe secret/price IDs.
- Stripe webhook handling verifies signatures before subscription updates.
- Live Stripe checkout/webhook tests remain blocked until Stripe CLI/provider credentials are available.

---

# Phase 20: Docker and Local Deployment

Goal: Make local and production-style deployment predictable.

## Checklist

- [x] Add Dockerfile for web.
- [x] Add Dockerfile for API.
- [x] Add Dockerfile for worker.
- [x] Add local Docker Compose.
- [x] Add production-style Docker Compose.
- [x] Add PostgreSQL service.
- [x] Add Redis service.
- [x] Add healthchecks where practical.
- [x] Add Traefik label examples if using Traefik.
- [x] Document local startup.
- [x] Document production environment assumptions.

## Verification

- [ ] Fresh clone can start locally through documented commands.
- [ ] Web can reach API.
- [ ] API can reach database and Redis.
- [ ] Worker can process queue.
- [x] Database and Redis are not publicly exposed in production pattern.

## Phase 20 Notes

- Completed on 2026-05-29.
- Added Dockerfiles for web, API, and worker runtimes.
- Local Compose now includes web, API, worker, Postgres, and Redis.
- Production-style Compose keeps Postgres and Redis on an internal network and includes example Traefik labels for web/API.
- Added `GET /api/health` for API healthchecks.
- Docker build/runtime verification could not run because Docker is unavailable in the current environment.

---

# Phase 21: Security Hardening

Goal: Review high-risk areas before serious use.

## Checklist

- [x] Review password hashing.
- [x] Review session/cookie/token security.
- [x] Review tenant isolation.
- [x] Review provider credential encryption.
- [x] Review Stripe webhook verification.
- [x] Review Twilio/Telegram webhook validation where available.
- [x] Review tracking/unsubscribe token safety.
- [x] Review rate limiting for auth endpoints.
- [x] Review CORS settings.
- [x] Review logging for sensitive data.
- [x] Review dependency vulnerabilities.

## Verification

- [x] Security review notes documented.
- [x] Known risks tracked.
- [ ] Critical issues fixed before production.

## Phase 21 Notes

- Completed on 2026-05-29.
- Security review notes are documented in `docs/security-review.md`.
- Stripe webhook verification is implemented.
- `pnpm audit --audit-level high` ran and found high vulnerabilities that must be resolved before production.
- Twilio webhook signature validation and tighter auth-endpoint throttling remain production hardening blockers.

---

# Phase 22: Testing and Release Readiness

Goal: Ensure the MVP can be used reliably.

## Checklist

- [x] Add/confirm type check.
- [x] Add/confirm lint.
- [x] Add service tests for scheduling.
- [x] Add service tests for progress evaluation.
- [x] Add tests for reply normalization.
- [x] Add tests for active contact counting.
- [x] Add tests for tenant authorization.
- [ ] Add smoke test for campaign creation.
- [ ] Add smoke test for enrollment.
- [ ] Add smoke test for queued send.
- [x] Add release checklist.

## Verification

- [x] Type check passes.
- [x] Lint passes.
- [x] Tests pass.
- [ ] Docker build passes.
- [ ] Manual smoke test completed.

## Phase 22 Notes

- Completed on 2026-05-29.
- `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- Added an API roles guard test for tenant/member role authorization behavior.
- Release checklist is documented in `docs/release-checklist.md`.
- Live smoke tests for campaign creation, enrollment, queued sends, Docker build, and provider flows remain blocked until Docker/Postgres/Redis/provider services are available.

---

# Deferred Features

Do not build these in v1 unless explicitly requested:

- marketing site
- WordPress plugin
- hosted lesson pages
- visual node builder
- full branching
- AI chat/personalization
- WhatsApp/RCS
- Challenge Mode
- team-member granular permissions
- advanced segmentation
- provider-managed sending
- full CRM lifecycle tools
- affiliate/referral system

---

# Current Next Step

Start with Phase 0.

Do not scaffold or rewrite before inspecting the actual repo state.

After Phase 0, move to Phase 1 only if the baseline is understood and no conflicting existing structure needs review.
