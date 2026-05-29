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

- Completed on 2026-05-28 (re-outlined for clarity 2026-06-29).
- Prisma is the documented database tooling for schema, migrations, and generated client.
- The foundation tables (organizations, users, organization_members, password_reset_tokens) were established first.
- All Phase 3+ tables were added to the schema in subsequent build passes: persons, person_channels, campaigns, campaign_steps, enrollments, enrollment_step_states, message_outbox, message_events, tracked_links, provider_credentials, unsubscribe_tokens, unsubscribe_events, billing_subscriptions — along with all supporting enums.
- 9 migration files exist covering all tables.
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

- [ ] Add organization creation with owner signup.
- [ ] Add organization membership model.
- [ ] Add current organization resolution pattern.
- [ ] Add organization switcher support if needed.
- [ ] Add owner/admin permissions.
- [ ] Add tenant-scoped service context.
- [ ] Add repository/query pattern requiring organization context.
- [ ] Add tests for tenant isolation where practical.

## Verification

- [ ] Owner belongs to created organization.
- [ ] Admin cannot access unrelated organization data.
- [ ] Recipient cannot access organization admin routes.
- [ ] Organization-scoped query pattern is documented.

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

- [ ] Add CSS variable token file.
- [ ] Define color tokens.
- [ ] Define typography scale.
- [ ] Define spacing scale.
- [ ] Define radius tokens.
- [ ] Define shadow tokens.
- [ ] Define focus states.
- [ ] Create UI primitives:
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
- [ ] Add basic app layouts:
  - admin layout
  - recipient layout
  - auth layout

## Verification

- [ ] Tokens are used by primitives.
- [ ] No major feature UI uses arbitrary styling before primitives exist.
- [ ] UI is readable on mobile and desktop.

---

# Phase 7: App Shells and Navigation

Goal: Create usable skeletons for admin and recipient experiences.

## Admin Shell Checklist

- [ ] Add admin dashboard route.
- [ ] Add campaigns route.
- [ ] Add persons route.
- [ ] Add settings/integrations route.
- [ ] Add billing route placeholder.
- [ ] Add authenticated navigation.
- [ ] Add loading/error states.

## Recipient Shell Checklist

- [ ] Add recipient dashboard route.
- [ ] Add recipient campaign detail route.
- [ ] Add recipient settings route.
- [ ] Add simple mobile-first navigation.

## Verification

- [ ] Authenticated owner/admin can access admin shell.
- [ ] Recipient can access only recipient shell.
- [ ] Unauthenticated users redirect to login.
- [ ] Navigation does not expose unauthorized routes.

---

# Phase 8: Persons and Channels

Goal: Add unified Person records and channel management.

## Database Checklist

- [ ] Add persons table.
- [ ] Add person_channels table.
- [ ] Add tags field or supporting table if chosen.
- [ ] Add channel status and enabled fields.
- [ ] Add suppression/unsubscribe fields.

## API Checklist

- [ ] Create person.
- [ ] List persons with pagination.
- [ ] View person.
- [ ] Update person.
- [ ] Archive/soft-delete person if needed.
- [ ] Add/update person channel.
- [ ] Enable/disable person channel.

## UI Checklist

- [ ] Persons list.
- [ ] Person detail.
- [ ] Person create/edit form.
- [ ] Channel management UI.

## Verification

- [ ] Persons are tenant-scoped.
- [ ] Channels validate email/phone/Telegram identifiers.
- [ ] Recipients cannot view other persons.
- [ ] Admin can manage persons in own organization only.

---

# Phase 9: Campaigns and Steps

Goal: Add linear campaign creation and simple step editing.

## Database Checklist

- [ ] Add campaigns table.
- [ ] Add campaign_steps table.
- [ ] Add schedule rule fields.
- [ ] Add progress rule fields.
- [ ] Add mode field.
- [ ] Add channel defaults.
- [ ] Add step variant fields for SMS, Telegram, and email.

## API Checklist

- [ ] Create campaign.
- [ ] List campaigns.
- [ ] View campaign.
- [ ] Update campaign.
- [ ] Archive campaign.
- [ ] Add step.
- [ ] Update step.
- [ ] Reorder steps.
- [ ] Save draft step.
- [ ] Publish/activate campaign when valid.

## UI Checklist

- [ ] Campaign list.
- [ ] Campaign setup form.
- [ ] Step list as vertical stack.
- [ ] Add Step editor.
- [ ] Save & Add Another.
- [ ] Save & Close.
- [ ] Save Draft.
- [ ] Channel-specific variants.
- [ ] Standard/Advanced Mode progressive disclosure.

## Verification

- [ ] Admin can create linear campaign.
- [ ] Admin can add multiple steps quickly.
- [ ] Campaign cannot activate without required fields.
- [ ] Campaigns are tenant-scoped.
- [ ] No branching UI exists in v1.

---

# Phase 10: Enrollments and Active Contact Limits

Goal: Connect Persons to Campaigns and enforce billing limits.

## Database Checklist

- [ ] Add enrollments table.
- [ ] Add enrollment_step_states table.
- [ ] Add indexes for campaign/person/status lookup.
- [ ] Add active contact calculation support.

## API Checklist

- [ ] Enroll person in campaign.
- [ ] Remove/pause enrollment.
- [ ] List campaign enrollments.
- [ ] List person enrollments.
- [ ] Prevent enrollment beyond plan limit.
- [ ] Initialize step states or create them lazily according to chosen pattern.

## UI Checklist

- [ ] Add person to campaign.
- [ ] Add campaign to person if useful.
- [ ] Show enrollment status.
- [ ] Show current step/progress.
- [ ] Show active contact usage against plan limit.

## Verification

- [ ] Person starts at Step 1 by default.
- [ ] Active contact limit prevents over-enrollment.
- [ ] Enrollments are tenant-scoped.
- [ ] Duplicate active enrollments are prevented or handled clearly.

---

# Phase 11: Queue and Worker Infrastructure

Goal: Add Redis-backed worker infrastructure before sending messages.

## Checklist

- [ ] Add Redis to Docker Compose.
- [ ] Add BullMQ or selected queue tool.
- [ ] Add queue module/config.
- [ ] Add worker app startup.
- [ ] Add test job processor.
- [ ] Add scheduled job mechanism.
- [ ] Add retry/backoff defaults.
- [ ] Add worker logging.
- [ ] Document how to run API and worker separately.

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
- [ ] Redis outage fails visibly.
- [ ] Worker can run separately from API.

---

# Phase 12: Scheduling Engine

Goal: Determine which enrollment steps are due and enqueue delivery.

## Checklist

- [ ] Implement schedule rule parser/evaluator.
- [ ] Support Daily.
- [ ] Support Weekdays.
- [ ] Support Mon/Wed/Fri.
- [ ] Support custom interval.
- [ ] Support custom days-of-week.
- [ ] Support per-step delay override.
- [ ] Respect recipient timezone if known; otherwise use organization/default timezone.
- [ ] Prevent duplicate sends for same enrollment/step/channel.
- [ ] Enqueue send-message jobs.

## Verification

- [ ] Due steps are identified correctly.
- [ ] Non-due steps are skipped.
- [ ] Duplicate sends are prevented.
- [ ] Schedule tests cover core templates.

---

# Phase 13: Message Preparation and Tracked Links

Goal: Prepare messages and track outbound links.

## Checklist

- [ ] Add message_outbox table.
- [ ] Add message_events table.
- [ ] Add tracked_links table.
- [ ] Implement merge tag replacement.
- [ ] Implement channel variant selection.
- [ ] Implement link extraction and rewrite.
- [ ] Implement tracked link redirect endpoint.
- [ ] Record click events.
- [ ] Redirect safely to original URL.

## Verification

- [ ] Links are rewritten per enrollment/step.
- [ ] Click is recorded.
- [ ] Recipient is redirected correctly.
- [ ] Invalid/expired tracking token fails safely.
- [ ] No raw secrets in tracking URLs.

---

# Phase 14: Progress Evaluation

Goal: Evaluate step completion based on time, click, or reply.

## Checklist

- [ ] Add ProgressService.
- [ ] Implement time-based completion.
- [ ] Implement link-click completion.
- [ ] Implement reply-required completion.
- [ ] Implement any-reply mode.
- [ ] Implement keyword/phrase matching.
- [ ] Normalize reply text:
  - lowercase
  - remove punctuation
  - normalize whitespace
- [ ] Update enrollment step state.
- [ ] Advance enrollment when appropriate.
- [ ] Mark campaign complete when final step complete.

## Verification

- [ ] Time-based progress works.
- [ ] Click-required progress works.
- [ ] Any-reply progress works.
- [ ] Keyword reply progress ignores case and punctuation.
- [ ] Completion logic exists only in ProgressService or documented equivalent.

---

# Phase 15: Provider Integrations

Goal: Add real sending through Twilio, Telegram, and SMTP.

## Shared Checklist

- [ ] Add provider_credentials table.
- [ ] Encrypt credentials at rest.
- [ ] Add settings UI for credentials.
- [ ] Mask saved credentials in UI.
- [ ] Add provider test connection actions where practical.
- [ ] Add safe provider error normalization.

## Twilio Checklist

- [ ] Add Twilio provider client.
- [ ] Send SMS.
- [ ] Receive delivery status callback if practical.
- [ ] Receive inbound reply webhook.
- [ ] Validate webhook where practical.

## Telegram Checklist

- [ ] Add Telegram Bot API client.
- [ ] Send Telegram message.
- [ ] Add recipient Telegram link flow.
- [ ] Receive inbound reply webhook.
- [ ] Handle blocked bot/no chat access.

## SMTP Checklist

- [ ] Add SMTP provider client.
- [ ] Add SMTP presets/guidance:
  - Brevo
  - SendGrid
  - Mailgun
  - generic SMTP
- [ ] Send email subject/body.
- [ ] Handle transient vs credential failures.

## Verification

- [ ] Provider credentials are encrypted.
- [ ] Sending works in dev/test mode or provider sandbox where available.
- [ ] Failed credentials are handled safely.
- [ ] Replies are logged where supported.
- [ ] No provider secrets appear in logs.

---

# Phase 16: Unsubscribe and Deletion Requests

Goal: Give recipients safe control over campaign/global unsubscribe and deletion request.

## Checklist

- [ ] Add unsubscribe token generation.
- [ ] Add unsubscribe landing page.
- [ ] Add campaign-scope unsubscribe action.
- [ ] Add global unsubscribe action.
- [ ] Add delete account request action.
- [ ] Disable sends immediately after global unsubscribe or deletion request.
- [ ] Disable recipient login after deletion request.
- [ ] Add admin visibility for deletion-requested persons.
- [ ] Ensure outbound messages include unsubscribe access where appropriate.

## Verification

- [ ] Campaign unsubscribe only stops one campaign.
- [ ] Global unsubscribe stops all campaigns.
- [ ] Deletion request disables login and sending.
- [ ] Unsubscribe actions are tenant-safe and token-safe.
- [ ] Admin can see deletion-requested status.

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

- [ ] Add analytics service.
- [ ] Add active contact calculation.
- [ ] Add campaign-level summary queries.
- [ ] Add dashboard API.
- [ ] Add admin dashboard UI.
- [ ] Add metric cards.
- [ ] Add campaign performance list.
- [ ] Add empty states.

## Verification

- [ ] Metrics are tenant-scoped.
- [ ] Active contact count matches definition.
- [ ] Dashboard loads without expensive unbounded queries.
- [ ] Empty account shows useful guidance.

---

# Phase 18: Recipient Dashboard

Goal: Build simple recipient-facing dashboard.

## Checklist

- [ ] Show enrolled campaigns.
- [ ] Show campaign progress.
- [ ] Show completed steps.
- [ ] Show past step messages/content.
- [ ] Show basic channel preferences.
- [ ] Allow unsubscribe access.
- [ ] Respect deletion requested state.
- [ ] Keep mobile-first layout.

## Verification

- [ ] Recipient sees only their own campaigns.
- [ ] Recipient can view past steps.
- [ ] Recipient cannot access admin routes.
- [ ] Mobile layout is usable.

---

# Phase 19: Billing with Stripe

Goal: Add contact-based billing and plan enforcement.

## Checklist

- [ ] Add Stripe config.
- [ ] Add billing plan constants.
- [ ] Add subscription data model.
- [ ] Add checkout/customer portal flow if included in v1.
- [ ] Add Stripe webhook endpoint.
- [ ] Verify Stripe webhook signatures.
- [ ] Store verified subscription status.
- [ ] Enforce active contact limits on enrollment.
- [ ] Show plan and active contact usage in UI.

## Verification

- [ ] Free plan enforces 10 active contacts.
- [ ] Paid plans enforce configured limits.
- [ ] Stripe webhook signature validation works.
- [ ] Client cannot fake subscription status.
- [ ] Billing state is tenant-scoped.

---

# Phase 20: Docker and Local Deployment

Goal: Make local and production-style deployment predictable.

## Checklist

- [ ] Add Dockerfile for web.
- [ ] Add Dockerfile for API.
- [ ] Add Dockerfile for worker.
- [ ] Add local Docker Compose.
- [ ] Add production-style Docker Compose.
- [ ] Add PostgreSQL service.
- [ ] Add Redis service.
- [ ] Add healthchecks where practical.
- [ ] Add Traefik label examples if using Traefik.
- [ ] Document local startup.
- [ ] Document production environment assumptions.

## Verification

- [ ] Fresh clone can start locally through documented commands.
- [ ] Web can reach API.
- [ ] API can reach database and Redis.
- [ ] Worker can process queue.
- [ ] Database and Redis are not publicly exposed in production pattern.

---

# Phase 21: Security Hardening

Goal: Review high-risk areas before serious use.

## Checklist

- [ ] Review password hashing.
- [ ] Review session/cookie/token security.
- [ ] Review tenant isolation.
- [ ] Review provider credential encryption.
- [ ] Review Stripe webhook verification.
- [ ] Review Twilio/Telegram webhook validation where available.
- [ ] Review tracking/unsubscribe token safety.
- [ ] Review rate limiting for auth endpoints.
- [ ] Review CORS settings.
- [ ] Review logging for sensitive data.
- [ ] Review dependency vulnerabilities.

## Verification

- [ ] Security review notes documented.
- [ ] Known risks tracked.
- [ ] Critical issues fixed before production.

---

# Phase 22: Testing and Release Readiness

Goal: Ensure the MVP can be used reliably.

## Checklist

- [ ] Add/confirm type check.
- [ ] Add/confirm lint.
- [ ] Add service tests for scheduling.
- [ ] Add service tests for progress evaluation.
- [ ] Add tests for reply normalization.
- [ ] Add tests for active contact counting.
- [ ] Add tests for tenant authorization.
- [ ] Add smoke test for campaign creation.
- [ ] Add smoke test for enrollment.
- [ ] Add smoke test for queued send.
- [ ] Add release checklist.

## Verification

- [ ] Type check passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Docker build passes.
- [ ] Manual smoke test completed.

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
