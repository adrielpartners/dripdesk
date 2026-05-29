# ARCHITECTURE.md

Version: 1.0  
Project: DripDesk  
Repository: `dripdesk`  
System Type: Multi-Tenant SaaS Application  
Last Updated: 2026-05-28

---

# Purpose

DripDesk is a mobile-first micro-course delivery SaaS for coaches, creators, educators, and mentors who want to deliver short lessons directly to a recipient's phone and increase completion.

DripDesk is not a CRM, not a full marketing automation platform, and not a visual node-based automation builder.

The product exists to make course/content delivery simpler, more personal, and easier to complete.

---

# 1. Project Identity

## Project Name

DripDesk

## One-Sentence Summary

DripDesk is a multi-tenant SaaS app that lets creators build simple drip campaigns and deliver short lessons through SMS, Telegram, and email so recipients actually consume and complete the content.

## Primary Audience

Primary buyers/admin users:

- coaches
- course creators
- content creators
- online educators
- Christian mentors and discipleship leaders
- consultants delivering guided client education

Primary recipients:

- students
- clients
- group members
- coaching participants
- subscribers receiving short learning sequences

## Core Problem

People are overwhelmed by content, ignore email, forget course portals, and fail to complete courses.

Many existing automation tools can technically create drip sequences, but they often require tedious node builders, delay blocks, and complex configuration that makes simple micro-course delivery harder than it should be.

## Core Value

DripDesk helps creators deliver just enough content at the right time through channels recipients already check, increasing consumption speed, engagement, and completion.

---

# 2. System Type

## Classification

Standalone Multi-Tenant SaaS Application

## Why This Classification Is Correct

DripDesk is a hosted product with its own account system, organizations, billing, durable database, admin dashboard, recipient dashboard, integrations, and background processing.

It is not a WordPress plugin in v1.

A WordPress plugin may be added later as a connector or access point, but WordPress is not the application host and is not the durable source of truth for v1.

---

# 3. Product Scope

## Version One Goals

- Create a SaaS account and organization.
- Support email/password authentication for admins and recipients.
- Support organization-level multi-tenancy from day one.
- Allow owners/admins to create linear drip campaigns.
- Allow owners/admins to add campaign steps quickly using a simple editor.
- Support schedule templates such as Daily, Weekdays, Monday/Wednesday/Friday, custom interval, and custom days of week.
- Support progress rules:
  - time-based
  - link-click required
  - reply required
- Support SMS delivery through Twilio.
- Support Telegram delivery through Telegram Bot API.
- Support email delivery through SMTP.
- Send on all enabled recipient channels simultaneously in v1.
- Track sends, clicks, replies, step completion, and campaign completion.
- Provide an admin dashboard focused on active contacts, engagement, and completion.
- Provide a simple recipient dashboard for viewing assigned campaigns, past steps, completion, and settings.
- Support unsubscribe from one campaign, unsubscribe from all campaigns, and deletion requests.
- Support Stripe billing based on active contacts.

## Explicit Non-Goals

- No marketing site work in v1.
- No native WordPress plugin in v1.
- No visual node-based automation builder in v1.
- No full branching logic in v1.
- No AI assistant or AI personalization in v1.
- No hosted lesson-page builder in v1.
- No full CRM features in v1.
- No complex segmentation engine in v1.
- No fallback-channel routing in v1.
- No cohort-based Challenge Mode in v1.
- No affiliate system in v1.
- No marketplace in v1.
- No white-label system in v1.

## Success Criteria

v1 is successful when:

- A creator can sign up, create a campaign, add steps, add people, and start delivery quickly.
- Messages are delivered reliably through configured channels.
- Recipients can log in with email/password and see their content history.
- Clicks, replies, and completion are tracked accurately enough for practical admin decisions.
- Active contact billing limits are enforced.
- The system remains clean, portable, Dockerized, and understandable for AI-assisted development.

---

# 4. Core Technology Stack

## Repository

- Monorepo

## Frontend

- Nuxt 3
- Vue 3
- TypeScript

## Backend API

- Node.js
- NestJS
- TypeScript

## Background Processing

- Redis
- BullMQ or equivalent Redis-backed Node queue
- Separate worker process/container

## Database

- PostgreSQL
- Repository-owned migrations

## Billing

- Stripe

## Messaging Integrations

- Twilio for SMS
- Telegram Bot API for Telegram
- SMTP for email
  - Brevo guidance
  - SendGrid guidance
  - Mailgun guidance
  - generic SMTP guidance

## Infrastructure

- Docker
- Docker Compose
- Traefik or another explicitly documented reverse proxy
- environment-based configuration

## Deviations From Constitution Defaults

The frontend follows the standard Nuxt/Vue/TypeScript direction.

The server intentionally uses NestJS instead of Nitro because DripDesk needs a structured backend API, background job orchestration, webhook handling, durable multi-tenant business logic, and integration services.

This deviation is intentional and reversible only with meaningful backend rewrite cost.

---

# 5. Hosting and Portability

## Hosting Model

DripDesk should be deployable on a standard VPS using Docker Compose.

Expected production shape:

```text
HTTPS reverse proxy
→ Nuxt web container
→ NestJS API container
→ PostgreSQL
→ Redis
→ worker container
→ external providers
```

## Portability Requirement

The application must remain self-hostable and portable.

Do not depend on Vercel, Supabase, Firebase, Netlify, or another managed platform as a hard runtime requirement.

Managed external services may be used intentionally for specific integrations, such as Stripe, Twilio, Telegram, and SMTP providers.

## Infrastructure Constraints

Assume the app may run on modest VPS infrastructure at first.

The system must:

- keep API requests fast
- run sending and scheduled work in workers
- avoid unbounded queue growth
- enforce provider timeouts
- enforce retry limits
- protect database and Redis from public access
- keep secrets out of the repo
- support backups of PostgreSQL

---

# 6. Monorepo Structure

Target structure:

```text
dripdesk/
  apps/
    web/
      app/
      components/
      composables/
      layouts/
      pages/
      plugins/
      stores/
      assets/
      nuxt.config.ts
    api/
      src/
        main.ts
        modules/
        common/
        config/
        database/
        auth/
        organizations/
        users/
        persons/
        campaigns/
        enrollments/
        messages/
        tracking/
        integrations/
        billing/
        webhooks/
      test/
    worker/
      src/
        main.ts
        processors/
        jobs/
        services/
        config/
  packages/
    shared/
      src/
        types/
        constants/
        schemas/
    database/
      migrations/
      seeds/
      schema/
    config/
  docker/
    docker-compose.yml
    docker-compose.prod.yml
  docs/
  AGENTS.md
  CODING_CONSTITUTION.md
  ARCHITECTURE.md
  DECISIONS.md
  IMPLEMENTATION_PLAN.md
  PROJECT_RULES.md
  package.json
  turbo.json
  tsconfig.base.json
  README.md
```

## Folder Responsibilities

- `apps/web` owns the Nuxt frontend UI only.
- `apps/api` owns HTTP APIs, auth, validation, authorization, service orchestration, and webhooks.
- `apps/worker` owns queued background jobs and scheduled work.
- `packages/shared` owns shared domain types, constants, and schemas that are safe to share across apps.
- `packages/database` owns Prisma schema definitions, Prisma migrations, seeds, and database tooling.
- `packages/config` owns shared configuration helpers if needed.
- `docker` owns Docker Compose and deployment-related support files.
- `docs` owns supplemental documentation if needed.

Avoid vague folders such as `helpers`, `misc`, `stuff`, `temp`, `old`, or `new`.

Runtime files must not be stored in source-controlled folders.

---

# 7. Domain Model

## Organization

Represents a tenant.

Organizations own campaigns, persons, enrollments, provider settings, billing plans, and admin memberships.

## User

Represents an authenticated account.

Users may be:

- owner
- admin
- recipient

A user may belong to an organization as an owner/admin or may exist as a recipient/end user.

## Organization Membership

Connects users to organizations with a role.

Roles in v1:

- owner
- admin

Recipient access should not be represented as an organization admin membership unless intentionally needed.

## Person

Represents the recipient/contact identity inside an organization.

A Person is the unified contact record for campaign delivery.

Fields include:

- id
- organization_id
- linked user_id when recipient account exists
- display name
- timezone if known
- status
- tags
- deletion/request status

## Person Channel

Represents a reachable channel for a Person.

Supported v1 channel types:

- sms
- telegram
- email

Fields include:

- person_id
- channel_type
- address or external identifier
- verification status
- enabled flag
- unsubscribed/suppressed flag
- provider metadata

Phase 8 implementation stores `organization_id` on both `persons` and `person_channels` so every read/write can be tenant-scoped directly. Channel uniqueness is enforced per organization, channel type, and address.

## Campaign

Represents a linear micro-course/drip sequence.

Fields include:

- organization_id
- name
- description
- status
- default channels
- schedule rule
- progress rule
- mode
- created_by

Campaign modes:

- standard
- advanced

Advanced Mode in v1 is limited to keyword reply requirements and per-step overrides.

Phase 9 implementation stores campaigns in `campaigns`. All campaign reads and writes are scoped by `organization_id` through tenant-aware repositories. Campaign activation is allowed only when the campaign has required metadata, at least one default delivery channel, and at least one non-archived step with deliverable content.

## Campaign Step

Represents one lesson/message in a campaign.

Fields include:

- campaign_id
- step number/order
- title
- status
- default content
- SMS variant
- Telegram variant
- email subject/body variant
- delay override if any
- channel override if any

Phase 9 implementation stores steps in `campaign_steps`. Steps are linear only and ordered by `step_order`; reordering requires the complete active step list for the campaign. Step creation supports draft and published states. Published steps require a title and at least one content variant. Branching, enrollment state, message delivery, and scheduler behavior remain later-phase work.

## Enrollment

Connects a Person to a Campaign.

Default behavior:

- recipients start at Step 1 when enrolled.

Phase 10 implementation stores enrollments in `enrollments`. Enrollment records carry `organization_id`, `campaign_id`, `person_id`, status, `current_step_order`, and enrollment lifecycle timestamps. Admin enrollment APIs are tenant-scoped and require owner/admin membership. Duplicate person/campaign enrollments are handled by a database uniqueness constraint and service-level conflict responses.

Active contact enforcement is introduced in Phase 10 using the documented active contact definition: a Person with at least one active enrollment created within the last 30 days. Until the billing phase adds persisted subscription plans, the API reports and enforces the Free plan limit of 10 active contacts.

## Enrollment Step State

Tracks per-recipient progress for each campaign step.

States/events include sent, delivered, opened if available, clicked, replied, completed, failed, skipped, and unsubscribed where relevant.

Phase 10 initializes `enrollment_step_states` for the campaign's currently published steps at enrollment time. Phase 14 evaluates completion through `ProgressService`, updates completed step states, advances active enrollments to the next published step, and marks the enrollment completed when the final step is complete. Provider delivery and reply ingestion remain later-phase work.

## Message Outbox

Represents queued delivery work for a specific enrollment, step, person channel, and provider.

Phase 13 implementation stores prepared outbound messages in `message_outbox`. Each record is tenant-scoped and tied to one enrollment, campaign step, person, person channel, and channel type. The outbox prevents duplicate preparation for the same enrollment/step/channel and stores the channel-selected, merge-tagged, link-rewritten message body. Provider transmission remains later-phase work.

## Message Event

Represents provider and tracking events.

Events include:

- queued
- sent
- delivered
- failed
- opened
- clicked
- replied
- completed
- unsubscribed

Phase 13 records `prepared` events when a worker prepares a message and `clicked` events when a recipient follows a tracked link. Provider events such as sent, delivered, failed, opened, and replied remain later-phase work.

## Tracked Link

Maps a generated tracking URL to the original URL, enrollment, step, and recipient context.

Used for click-based completion and analytics.

Phase 13 tracked links use opaque random tokens only. Tracking URLs do not include raw enrollment, step, recipient, organization, or provider secret values. Redirects only allow `http` and `https` targets and expired or unknown tokens fail without redirecting.

## Admin Analytics Dashboard

Phase 17 exposes `GET /dashboard` for owner/admin users in the current organization. The dashboard is tenant-scoped through `CurrentOrganizationGuard` and `TenantContext`.

Metrics:

- Active Contacts: distinct people with at least one active enrollment created in the last 30 days.
- Average Open Rate: opened message events divided by sent outbox messages.
- Average Click Rate: clicked message events divided by sent outbox messages.
- Average Completion Rate: completed enrollments divided by non-removed enrollments.

Campaign performance rows include active enrolled count, open/click/completion rates, and last sent timestamp. The list is capped at 20 non-archived campaigns ordered by recent update so the dashboard does not load unbounded campaign, recipient, outbox, or event data.

## Reply Rule

Defines reply completion requirements.

Modes:

- any reply counts
- keyword/phrase match

Keyword/phrase matching ignores capitalization and punctuation.

## Unsubscribe Event

Records unsubscribe behavior.

Scopes:

- campaign
- organization/global

Phase 16 stores hashed unsubscribe tokens in `unsubscribe_tokens` and action audit records in `unsubscribe_events`. Raw unsubscribe tokens are only present in recipient-facing links and are not stored.

## Deletion Request

Represents recipient-requested account deletion.

V1 behavior:

- soft delete/request only
- disable future sends
- disable recipient login
- preserve database record until admin action

Phase 16 deletion requests mark the Person `deletion_requested`, suppress and unsubscribe all person channels, remove active enrollments, and block recipient login for linked recipient users.

## Provider Credential

Stores encrypted organization-owned integration credentials.

Types:

- Twilio
- Telegram Bot
- SMTP

Phase 15 stores provider credentials in `provider_credentials`. The encrypted payload is never returned to the frontend; API responses expose masked configuration only. Credentials are organization-owned BYO settings.

## Subscription / Billing Plan

Tracks Stripe subscription state and plan limits.

Plans:

- Free: 10 active contacts
- Core: 250 active contacts
- Plus: 1000 active contacts
- Pro: 5000 active contacts
- Enterprise: custom

Active contact definition:

```text
A Person enrolled in at least one campaign in the last 30 days.
```

Phase 19 stores current organization billing state in `billing_subscriptions`. The table owns plan ID, billing status, active contact limit, Stripe customer ID, Stripe subscription ID, current period end, and cancel-at-period-end state.

Enrollment active-contact enforcement reads this organization-owned subscription row and falls back to the Free plan when no row exists. Stripe checkout and customer portal endpoints are owner-only. Subscription state changes come from verified Stripe webhooks; the browser cannot directly set billing status.

## Recipient Dashboard

Phase 18 exposes authenticated recipient dashboard routes under `/portal`.

Recipient data is scoped by the authenticated user's linked `Person` records (`persons.user_id`). Recipient routes do not accept client-provided organization IDs for authorization.

Recipients can view assigned campaigns, progress, completed steps, delivered step content/message history, channel settings, and unsubscribe controls. Deletion-requested recipient records are excluded from active dashboard data, and recipient login is blocked for deletion-requested records.

---

# 8. System Layers

## Actual Flow

```text
Nuxt Page / Component
→ API Client
→ NestJS Controller
→ Validation / Authorization
→ Service Layer
→ Repository / Database Layer
→ PostgreSQL

Scheduled Job / Webhook
→ NestJS Controller or Worker Processor
→ Validation / Authorization
→ Service Layer
→ Repository / Database Layer
→ Queue / Provider Client
```

## Web UI Layer

The web layer may render admin and recipient interfaces, manage local UI state, call API endpoints, display validation errors, and use shared types.

The web layer must not directly access the database, own business rules, decide authorization, contain provider integration logic, or contain scheduling logic.

## API Controller Layer

Controllers may parse requests, validate shape, enforce authentication and authorization, call services, and return consistent responses.

Controllers must not contain business workflows, call external providers directly, perform long-running sending inline, or contain database query sprawl.

## Service Layer

Services own business behavior.

Expected services:

- AuthService
- OrganizationService
- UserService
- PersonService
- CampaignService
- StepService
- EnrollmentService
- SchedulingService
- ProgressService
- MessageService
- TrackingService
- ReplyService
- ProviderCredentialService
- TwilioService
- TelegramService
- EmailService
- BillingService
- UnsubscribeService
- DeletionRequestService

## Repository / Data Layer

Data access should be explicit and predictable.

Repositories or database modules own database reads/writes and transaction boundaries.

Do not scatter raw queries through controllers or UI.

## Worker Layer

Workers run async jobs.

Workers may send due messages, process provider callbacks if routed through queues, process retries, evaluate scheduled due steps, update delivery state, and run cleanup tasks.

Workers must not expose user-facing HTTP routes, own UI concerns, bypass service-layer business rules, or run unbounded retries.

---

# 9. Request and Data Flows

## Admin Campaign Creation Flow

```text
Admin logs in
→ creates campaign
→ selects channels, schedule, progress rule
→ adds steps
→ saves campaign
→ enrolls persons
→ scheduler picks up due enrollment steps
```

## Step Delivery Flow

```text
Scheduler finds due enrollment step
→ enqueues message jobs for each enabled channel
→ worker builds channel-specific message
→ worker injects merge tags
→ worker rewrites links to tracked URLs
→ worker writes prepared message to outbox
→ worker logs prepared message event
→ later phase sends through provider and updates delivery state
```

## Click Progress Flow

```text
Recipient clicks tracked link
→ API resolves tracked link
→ click event is recorded
→ recipient is redirected to original URL
→ progress service evaluates step completion
```

## Reply Progress Flow

```text
Provider webhook receives reply
→ API validates provider webhook
→ reply event is recorded
→ progress service normalizes reply text
→ progress service evaluates any-reply or keyword/phrase rule
→ enrollment step state is updated when matched
```

## Time-Based Progress Flow

```text
Scheduled job checks due enrollments
→ if progress rule is time-based, next step is eligible based on schedule
→ message jobs are enqueued
→ worker prepares the message
→ progress service completes and advances time-based steps
```

## Recipient Login Flow

```text
Recipient enters email/password
→ API authenticates credentials
→ recipient dashboard loads assigned campaigns and past steps
```

## Unsubscribe Flow

```text
Recipient clicks unsubscribe link
→ unsubscribe page loads with scoped token
→ recipient chooses campaign/global/delete
→ system records event
→ campaign/global suppression is applied or deletion request is recorded
→ future scheduler, preparation, and provider-send paths skip suppressed recipients
```

---

# 10. Authentication and Authorization

## Does This System Have Accounts?

Yes.

V1 includes email/password authentication for both admins and recipients.

Magic links may be added later but are not the v1 default.

## Authentication Method

- Email/password
- Secure password hashing
- JWT bearer tokens for the current foundation API
- Optional email verification if implementation scope allows

Password requirements must be reasonable and user-friendly.

## Roles

V1 roles:

```text
owner
admin
recipient
```

## Role Responsibilities

### Owner

May manage organization settings, billing, integrations, admins, campaigns, persons, enrollments, and analytics.

### Admin

May manage campaigns, steps, persons, enrollments, analytics, and provider settings if granted or allowed in v1.

May not manage billing unless explicitly allowed later.

### Recipient

May view their own enrolled campaigns, past steps/messages, channel preferences where supported, unsubscribe, and request deletion.

May not access admin organization data, other recipients, or campaign management.

## Authorization Boundary

Authorization must happen server-side before service execution.

Client-side role checks are display-only.

All organization-scoped queries must include organization context.

Current organization context is resolved by the API from a verified organization membership. Clients may send `x-dripdesk-organization-id` to choose among organizations returned by `GET /organizations`, but the server must verify membership before attaching `TenantContext` to the request.

Organization-scoped services and repositories should accept `TenantContext` and filter by `tenant.organizationId`. Owner/admin permissions for organization admin routes are based on the current membership role, not only the global user role.

---

# 11. Validation Strategy

Validate all external input at the server boundary.

Validate:

- auth credentials
- organization IDs
- campaign fields
- schedule rules
- progress rules
- step content
- channel settings
- person channel values
- enrollment actions
- provider credentials
- webhooks
- billing callbacks
- unsubscribe tokens
- tracking tokens

Recommended validation:

- schema-based validation at controller boundaries
- domain validation in services
- provider-specific validation in integration modules

---

# 12. API Design and Response Shape

Use REST-style endpoints by default.

Use consistent envelopes when practical.

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message."
  }
}
```

Do not return stack traces, raw provider errors, secrets, internal SQL details, private tokens, or sensitive contact data unrelated to the request.

---

# 13. Background Jobs and Scheduling

## Do We Use Background Jobs?

Yes.

## What Runs Async?

- scheduled campaign delivery
- message sending
- provider retry handling
- webhook follow-up processing when needed
- active contact metric refresh if needed
- billing sync if needed
- cleanup tasks
- notification retries

## Queue Tooling

Recommended:

```text
Redis + BullMQ
```

Phase 11 implementation uses a single BullMQ queue named `dripdesk` with shared job names and bounded retry defaults in `@dripdesk/shared`. The API owns enqueueing through its queue module. The worker runs as a separate process in `apps/worker`, consumes the shared queue, logs job lifecycle events, and fails startup visibly when Redis cannot be reached.

## Job Types

Expected jobs:

- `schedule-due-steps`
- `send-message`
- `process-provider-event`
- `evaluate-progress`
- `cleanup-expired-tokens`

Phase 11 adds `test-job` for infrastructure verification only. `schedule-due-steps` is registered as a repeatable scheduled job.

Phase 12 implements due-step detection for active enrollments and enqueues deterministic `send-message` jobs for each enabled recipient channel. It supports Daily, Weekdays, Monday/Wednesday/Friday, custom interval, custom days of week, per-step delay overrides, local send time, and recipient timezone fallback to organization default timezone. It prevents duplicate scheduling by claiming pending enrollment step states as `queued` and by assigning deterministic BullMQ job IDs per enrollment, step, and channel.

Phase 13 implements `send-message` preparation in the worker: channel variant selection, merge tag replacement, tracked link creation and rewrite, `message_outbox` persistence, and prepared message events.

Phase 14 implements shared progress evaluation in `@dripdesk/database` through `ProgressService`. The API calls it after tracked-link clicks, and the worker calls it after prepared messages and for `evaluate-progress` jobs. Provider sends, provider event ingestion, and cleanup behavior remain later-phase work.

Phase 15 sends prepared outbox records through the configured organization provider for the channel. Successful sends mark outbox records `sent`, write `sent` events, and update the enrollment step state sent timestamp. Failed sends mark outbox records `failed` with normalized safe errors.

## Retry Strategy

Suggested defaults:

- transient provider send failure: retry up to 3 times
- provider rate limit: retry with backoff
- invalid credentials: no retry after classification
- invalid recipient channel: no retry
- malformed content: no retry
- webhook validation failure: no retry
- database outage: retry when safe

Do not create unbounded retry loops.

---

# 14. External Services and Integrations

## Stripe

Purpose: subscriptions, billing plan status, and plan limits.

Stripe webhook signatures must always be verified.

## Twilio

Purpose: SMS sending, SMS delivery callbacks where available, and SMS reply webhooks.

Never log the Twilio auth token.

Phase 15 uses organization Twilio credentials from `provider_credentials`. Status callbacks and inbound replies are accepted at API webhook routes and are recorded without logging provider secrets.

## Telegram Bot API

Purpose: Telegram message sending, recipient chat linking, and reply webhooks.

Never log the Telegram bot token.

Phase 15 uses organization Telegram bot credentials from `provider_credentials`. Recipient Telegram linking is represented by the person channel address containing the Telegram chat id. Telegram webhook shared-secret validation is supported when configured.

## SMTP

Purpose: email sending.

Supported configuration:

- Brevo
- SendGrid
- Mailgun
- generic SMTP

Never log SMTP passwords.

Phase 15 uses organization SMTP credentials from `provider_credentials` and supports Brevo, SendGrid, Mailgun, and generic SMTP presets in the admin setup UI.

## Reverse Proxy

Expected: Traefik or Nginx.

Purpose: HTTPS and routing to web/API containers.

---

# 15. Design System and Visual Identity

## Visual Tone

DripDesk should feel:

- clean
- modern
- airy
- light
- calm
- focused
- clearly readable
- mobile-friendly

## Color Direction

- medium green as primary accent
- light green as secondary accent
- neutral white and soft gray surfaces
- high-contrast text for readability

## Design System Rules

Use token-driven styling.

Required token categories:

- color
- typography
- spacing
- radius
- border
- shadow
- z-index
- motion timing

Suggested frontend structure:

```text
Design Tokens
→ UI Primitives
→ Feature Components
→ Pages
```

## UI Primitives

Expected primitives:

- AppButton
- AppCard
- AppInput
- AppSelect
- AppTextarea
- AppDialog
- AppTabs
- AppBadge
- AppTable
- AppEmptyState
- AppMetricCard

## Accessibility Baseline

- keyboard-accessible forms and controls
- visible focus states
- sufficient text contrast
- mobile-friendly tap targets
- labels for form fields
- user-safe error messages

---

# 16. Browser and Device Support

## Primary Admin Context

- desktop browser
- tablet acceptable
- mobile usable for basic admin tasks

## Primary Recipient Context

- mobile browser first
- desktop also supported

## Browser Baseline

Support current versions of Chrome, Safari, Firefox, and Edge.

---

# 17. Performance Strategy

## Performance Priorities

- fast dashboard load
- fast campaign editing
- reliable scheduled delivery
- fast tracking redirect
- no long-running API requests
- bounded worker concurrency
- provider timeouts
- efficient indexes on organization-scoped data

## Known Bottlenecks or Risks

- large recipient lists
- provider rate limits
- webhook bursts
- scheduled delivery spikes
- analytics queries on message events
- multi-channel fanout

## Mitigation

- background jobs
- indexes on tenant and enrollment fields
- pagination for lists
- bounded retries
- queue monitoring
- summary metrics where needed

---

# 18. Observability and Monitoring

## Logging

Use structured logs.

Log auth failures without sensitive details, campaign/enrollment changes, scheduled jobs, message send attempts, provider failures, webhook processing, progress evaluation, unsubscribe/deletion requests, billing webhooks, and worker failures.

Never log passwords, password hashes, provider secrets, auth tokens, webhook secrets, unnecessary message body content, or sensitive personal data beyond what is needed for diagnosis.

## Monitoring

v1 monitoring:

- API health endpoint
- web health where practical
- worker health/logs
- queue status
- container logs
- database health
- Redis health

Future monitoring:

- queue dashboard
- uptime monitor
- alerting for failed jobs
- alerting for provider credential errors

---

# 19. Deployment Architecture

## Local Development

```text
Docker Compose
→ web container
→ API container
→ worker container
→ PostgreSQL
→ Redis
```

## Production

```text
Internet
→ HTTPS reverse proxy
→ web container
→ API container
→ PostgreSQL
→ Redis
→ worker container
→ Stripe/Twilio/Telegram/SMTP
```

## Production Notes

- Run web, API, and worker as separate containers/processes.
- Keep PostgreSQL and Redis private.
- Use environment variables for configuration.
- Use Docker volumes for durable database storage.
- Back up PostgreSQL automatically.
- Do not expose database or Redis publicly.
- Configure provider webhooks to the public API URL.

Phase 20 adds Dockerfiles for web, API, and worker, plus local and production-style Compose files. The production-style Compose example keeps Postgres and Redis on an internal network and exposes web/API only through an edge network intended for a reverse proxy such as Traefik.

---

# 20. Environment Configuration

Recommended environment variables:

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
DRIPDESK_ENABLE_API_DOCS
```

Provider credentials for organizations should be stored encrypted in the database, not as shared global production credentials, unless a future decision changes this.

## Secret Values

Secrets include database password, Redis password if used, session secret, password pepper, encryption key, Stripe secret key, Stripe webhook secret, and organization provider credentials.

Secrets must never be committed.

---

# 21. Data Durability and Backup Strategy

## Durable Data

Durable data lives in PostgreSQL.

Durable data includes organizations, users, memberships, persons, person channels, campaigns, steps, enrollments, message events, tracking events, provider credentials, billing/subscription data, and unsubscribe/deletion records.

## Backup Strategy

Production PostgreSQL must be backed up automatically.

Minimum expectations:

- regular database dumps or volume backups
- backup location outside the primary container
- documented restore process before production launch
- periodic restore verification when production usage begins

## Deletion Policy

Recipient deletion requests are soft-delete/requested in v1.

When recipient chooses “Delete my account”:

- disable future sends immediately
- disable recipient login
- mark Person/User as deletion requested
- preserve database record for admin review

Permanent deletion can be added as an admin operation if implemented with clear audit and retention policy.

---

# 22. Security and Privacy

## Password Security

- hash passwords using a modern password hashing algorithm
- never store plaintext passwords
- never log passwords
- never log password hashes
- rate-limit login attempts if practical in v1
- use secure cookie/session settings in production

## Tenant Isolation

All organization-scoped reads and writes must enforce organization boundaries.

Never trust organization ID from the client alone.

## Provider Credential Security

- encrypt provider credentials at rest
- never expose secrets back to the frontend after save
- display only masked values
- avoid logging provider credentials

## Webhook Security

Validate provider webhooks where provider support exists.

Stripe webhook signatures must always be verified.

## Tracking and Unsubscribe Tokens

Use signed or opaque tokens.

Tokens should not expose raw database IDs when avoidable.

---

# 23. Future Architecture Hooks

The v1 schema should avoid blocking:

- Challenge Mode / cohort campaigns
- branching logic
- AI-assisted personalization
- WordPress connector plugin
- more channels such as WhatsApp/RCS
- team-member role beyond owner/admin
- richer analytics
- hosted lesson pages

Do not implement these in v1 unless explicitly requested.

Design for compatibility, not speculative complexity.

---

# 24. Open Questions / Deferred Decisions

These are intentionally deferred unless the user decides otherwise:

- exact UI component library, if any
- exact charting library
- exact production domain names
- whether email verification is mandatory in v1
- how permanent deletion is implemented after deletion request
- whether provider webhooks are processed inline or queued after validation
