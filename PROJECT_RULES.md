# PROJECT_RULES.md

Version: 1.0  
Project: DripDesk  
Repository: `dripdesk`  
System Type: Multi-Tenant SaaS Application  
Last Updated: 2026-05-28

---

# Purpose

This file defines repository-specific rules for AI agents and developers working on DripDesk.

This is not the architecture document. This file tells agents how to work inside this repo without turning DripDesk into a generic automation platform, CRM, LMS, or messy multi-app codebase.

Before making substantial changes, read:

1. `CODING_CONSTITUTION.md`
2. `AGENTS.md`
3. `ARCHITECTURE.md`
4. `DECISIONS.md`
5. `PROJECT_RULES.md`
6. `IMPLEMENTATION_PLAN.md` when working from the roadmap

---

# 1. Repository Role

This repo contains the DripDesk SaaS application.

The repo owns:

- Nuxt admin and recipient frontend
- NestJS API
- background worker
- shared types and constants
- database schema and migrations
- campaign delivery engine
- provider integrations
- billing integration
- Docker deployment configuration
- project documentation

The repo does not own:

- marketing site in the current build
- native WordPress plugin in v1
- hosted lesson pages in v1
- full CRM features in v1
- full LMS features in v1
- generic node-based automation builder in v1
- AI personalization in v1

---

# 2. Absolute Rules

AI agents must follow these rules:

1. Keep DripDesk focused on mobile-first micro-course delivery.
2. Do not turn DripDesk into a CRM.
3. Do not turn DripDesk into a full LMS.
4. Do not build a visual node automation builder in v1.
5. Do not build the marketing site unless explicitly asked.
6. Do not add a WordPress plugin unless explicitly asked.
7. Do not add AI features in v1 unless explicitly approved.
8. Do not run long-running sending work inside API requests.
9. Do not bypass tenant isolation.
10. Do not store provider credentials unencrypted.
11. Do not log secrets or unnecessary message bodies.
12. Do not add dependencies casually.
13. Do not create parallel patterns for the same responsibility.
14. Do not put business logic in Vue components.
15. Do not put raw database logic in controllers.
16. Do not claim tests/checks passed unless they were actually run.

---

# 3. Architectural Flow

Use this flow for normal application behavior:

```text
Nuxt Page / Component
→ API Client
→ NestJS Controller
→ Validation / Authorization
→ Service Layer
→ Repository / Data Layer
→ PostgreSQL
```

Use this flow for delivery/scheduled work:

```text
Scheduler / Worker
→ Job Processor
→ Service Layer
→ Repository / Data Layer
→ Provider Client
→ Message Event Logging
→ Progress Evaluation
```

## Web UI

Vue components may:

- render UI
- manage local interaction state
- call API client functions
- display server-returned errors
- compose primitives and feature components

Vue components must not:

- contain core campaign progression rules
- calculate tenant authorization
- directly access database
- directly call provider APIs
- own durable business behavior

## API Controllers

Controllers may:

- validate request shape
- enforce authentication
- enforce authorization
- call services
- return consistent response envelopes

Controllers must not:

- contain campaign scheduling logic
- call Twilio/Telegram/SMTP directly
- perform long-running work inline
- contain raw SQL sprawl
- duplicate service logic

## Services

Services own behavior.

Service responsibilities include:

- campaign creation/update rules
- step management
- enrollment rules
- active contact enforcement
- progress evaluation
- provider credential handling
- message preparation
- billing rules
- unsubscribe/deletion behavior

## Worker Processes

Worker processes run queued jobs.

Workers may:

- find due steps
- enqueue send jobs
- send messages
- process retries
- process provider events
- evaluate progress
- update message and enrollment state

Workers must not:

- expose user-facing routes
- bypass service rules
- run unbounded retries
- ignore provider failure states

---

# 4. File and Folder Rules

Use this preferred structure:

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
  AGENTS.md
  CODING_CONSTITUTION.md
  ARCHITECTURE.md
  DECISIONS.md
  IMPLEMENTATION_PLAN.md
  PROJECT_RULES.md
```

## File Placement

Place files according to responsibility:

- Nuxt pages: `apps/web/pages/`
- Nuxt layouts: `apps/web/layouts/`
- Nuxt UI primitives: `apps/web/components/primitives/`
- Nuxt feature components: `apps/web/components/features/`
- Nuxt composables: `apps/web/composables/`
- Nuxt API client: `apps/web/services/` or `apps/web/api/`, depending on implemented pattern
- Nest modules: `apps/api/src/modules/`
- Nest common utilities: `apps/api/src/common/`
- API config: `apps/api/src/config/`
- API database access: `apps/api/src/database/` or relevant module repository folders
- Worker processors: `apps/worker/src/processors/`
- Worker job definitions: `apps/worker/src/jobs/`
- Shared types/constants: `packages/shared/src/`
- Database migrations: `packages/database/migrations/`
- Docker files: `docker/`

Do not create vague folders such as `helpers`, `misc`, `stuff`, `temp`, `old`, or `new`.

A folder named `utils` is allowed only if it has a narrow, documented purpose and does not become a dumping ground.

---

# 5. Naming Rules

Use clear, boring, descriptive names.

## Files

Prefer kebab-case for TypeScript filenames unless framework conventions require otherwise.

Examples:

```text
campaign.service.ts
campaign.controller.ts
campaign.repository.ts
send-message.processor.ts
tracked-link.service.ts
provider-credential.service.ts
```

## Classes

Use PascalCase:

```text
CampaignService
EnrollmentService
SendMessageProcessor
```

## Functions and Variables

Use camelCase:

```text
createCampaign
evaluateProgress
activeContactCount
```

## Database Tables

Use snake_case plural table names:

```text
organizations
organization_members
users
persons
person_channels
campaigns
campaign_steps
enrollments
enrollment_step_states
message_outbox
message_events
tracked_links
provider_credentials
billing_subscriptions
```

## Constants

Use UPPER_SNAKE_CASE for true constants.

---

# 6. API Rules

Use REST-style endpoints unless a new decision is documented.

## Response Shape

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

## Error Rules

Do not return stack traces, SQL errors, provider raw dumps, secrets, private tokens, internal file paths, or unnecessary sensitive contact data.

## Route Rules

Routes must be organization-aware where applicable.

Every organization-scoped route must enforce that the authenticated user has access to the organization before service execution.

---

# 7. Authentication and Authorization Rules

V1 uses email/password authentication for admins and recipients.

Required:

- secure password hashing
- password reset flow before production
- server-side authorization checks
- tenant isolation on every organization-scoped query
- user-safe auth errors
- no password logging
- no password hashes returned to clients

Roles:

```text
owner
admin
recipient
```

Rules:

- Client-side role checks are for display only.
- Server-side checks are mandatory.
- Recipients may only access their own recipient dashboard data.
- Admins/owners may only access organizations they belong to.
- Owners manage billing and organization-level settings.
- Admin permissions may be broad in v1 but must not include organization deletion unless explicitly implemented.

---

# 8. Multi-Tenancy Rules

Every durable business record that belongs to an organization must include `organization_id` unless there is a documented reason not to.

Queries for organization-scoped data must filter by organization.

Never rely only on client-provided organization IDs.

Preferred authorization flow:

```text
authenticate user
→ resolve organization context
→ verify membership/role
→ call service with authorized context
→ service/repository queries include organization_id
```

High-risk tenant-scoped records:

- campaigns
- campaign_steps
- persons
- person_channels
- enrollments
- message_outbox
- message_events
- tracked_links
- provider_credentials
- billing subscriptions

---

# 9. Database and Migration Rules

All schema changes must use migrations.

Rules:

- Do not edit production database manually.
- Do not rely on undocumented database state.
- Commit all migrations.
- Keep migrations readable.
- Avoid destructive migrations unless explicitly approved.
- Add indexes for tenant-scoped lookup patterns.
- Add foreign keys where practical.
- Use soft delete/request states where product policy requires.

Do not add a second durable database.

---

# 10. Queue and Job Rules

Use Redis-backed queueing in v1.

Preferred:

```text
Redis + BullMQ
```

Expected queues/jobs:

- scheduled delivery check
- send message
- provider event processing
- progress evaluation
- billing sync
- cleanup

Rules:

- API requests must not perform bulk sending inline.
- Jobs must be idempotent when practical.
- Retries must be bounded.
- Provider failures must be logged safely.
- Queue errors must not silently disappear.
- Jobs must include enough context to diagnose failures without exposing secrets.

---

# 11. Provider Integration Rules

## Provider Credentials

Organization-owned provider credentials must be encrypted at rest.

Never log:

- Twilio auth token
- Telegram bot token
- SMTP password
- webhook signing secrets

Never return saved secrets to the frontend after storage.

Show masked values only.

## Twilio

Use for SMS sending, delivery status callbacks where available, and inbound reply webhooks.

## Telegram

Use for Telegram sending, chat linking, and inbound replies.

## SMTP

Use for email sending.

Include setup guidance/presets for Brevo, SendGrid, Mailgun, and generic SMTP.

## Channel Sending Rule

V1 sends on all enabled channels simultaneously.

Do not implement fallback/primary-channel routing unless explicitly asked.

---

# 12. Campaign Rules

V1 campaigns are linear.

Campaigns may have:

- default channels
- schedule template
- progress rule
- standard/advanced mode

Allowed v1 progress rules:

```text
time_based
link_click_required
reply_required
```

Advanced Mode in v1 may include:

- keyword/phrase reply requirements
- per-step delay override
- per-step channel override

Advanced Mode must not include full branching or visual node editing in v1.

---

# 13. Tracking and Progress Rules

## Link Tracking

Tracked links must map to organization, campaign, step, enrollment, and person.

Tracking redirects must be fast.

Do not expose raw IDs unnecessarily if opaque tokens can be used.

## Reply Tracking

Any reply on any channel must be logged.

For keyword/phrase matching:

- ignore capitalization
- ignore punctuation
- normalize whitespace
- match against admin-defined keywords/phrases

## Completion

Completion is evaluated by the ProgressService.

Do not duplicate completion logic in UI, controllers, or workers.

---

# 14. Unsubscribe and Deletion Rules

Every appropriate outbound message should include unsubscribe access.

Supported options:

- unsubscribe from this campaign
- unsubscribe from all campaigns
- delete my account

Delete account in v1 means:

- mark deletion requested
- disable future sends immediately
- disable recipient login
- preserve database record for admin review

Do not hard-delete recipient records unless an explicit admin hard-delete feature has been implemented.

---

# 15. Billing Rules

Billing is based on active contacts.

Active contact definition:

```text
A Person enrolled in at least one campaign in the last 30 days.
```

Plans:

```text
Free: 10
Core: 250
Plus: 1000
Pro: 5000
Enterprise: custom
```

Rules:

- enforce active contact limits on enrollment
- do not charge based on campaign count
- do not charge based on step count
- do not charge based on message count
- do not charge based on channel count
- Stripe webhook data must be verified server-side

---

# 16. Design System Rules

Use a token-driven design system.

Visual style:

- clean
- modern
- airy
- light
- calm
- readable
- mobile-friendly

Accent colors:

- medium green primary accent
- light green secondary accent

Rules:

- define tokens before heavy UI implementation
- use primitives before feature components
- avoid hardcoded colors where tokens exist
- avoid one-off spacing
- do not introduce a second visual language
- preserve accessibility and readable contrast

Suggested UI layering:

```text
Design Tokens
→ UI Primitives
→ Feature Components
→ Pages
```

---

# 17. Dependency Rules

Do not add dependencies casually.

Before adding a dependency, confirm:

- platform/framework cannot reasonably handle it
- need is recurring
- package is maintained
- package does not add disproportionate complexity
- package does not compromise portability
- package does not duplicate an existing dependency

If a dependency is added, explain why in the work summary.

---

# 18. Testing and Verification Rules

Use the test tools configured in the repo.

Expected verification types:

- TypeScript type check
- lint
- unit tests for services
- integration tests for critical API flows
- worker/job tests for delivery logic
- component tests where meaningful
- build checks

Priority test areas:

- authentication
- tenant authorization
- campaign scheduling
- progress evaluation
- reply normalization
- active contact counting
- unsubscribe/deletion behavior
- provider credential encryption
- billing webhook handling

Do not over-test framework internals or trivial getters.

---

# 19. Documentation Update Rules

Update documentation when changing:

- architecture
- folder structure
- roles/permissions
- database schema ownership
- environment variables
- provider integrations
- queue/job strategy
- billing rules
- unsubscribe/deletion behavior
- deployment requirements
- major UI design system rules

Update:

- `ARCHITECTURE.md` for current system facts
- `DECISIONS.md` for major decisions and tradeoffs
- `PROJECT_RULES.md` for repository-specific enforcement rules
- `IMPLEMENTATION_PLAN.md` when roadmap status changes

Do not let code and documentation drift.

---

# 20. Git and Agent Workflow

Before work:

```bash
git status
```

If there are existing changes, do not overwrite them.

Preferred workflow:

```bash
git pull
git checkout -b feature/short-description
# make changes
git status
# run checks
git add .
git commit -m "Short clear message"
git push
```

Do not use destructive commands such as:

```bash
git reset --hard
git clean -fd
git checkout -- .
```

unless explicitly instructed.

---

# 21. Definition of Done

A task is done when:

- the change matches the request
- code is in the correct architectural layer
- tenant isolation is preserved
- validation is present at the server boundary
- authorization is enforced server-side
- provider calls use safe error handling
- background jobs are used for async work
- retries are bounded
- secrets are not exposed
- UI follows the design system
- relevant checks were run or honestly reported
- docs were updated if architecture or rules changed

---

# 22. Agent Work Summary Format

At the end of a coding task, summarize:

```text
Summary:
- Changed ...
- Added ...
- Updated ...

Verification:
- Ran ...
- Not run: ... because ...

Docs:
- Updated ...
- Not updated because ...

Notes:
- Assumptions ...
- Risks ...
- Follow-up ...
```

Mention important files changed.

Mention whether API, auth, tenant isolation, queueing, delivery, billing, tracking, or deployment behavior was affected.

---

# Final Rule

Keep DripDesk simple.

Its core job is to deliver phone-first micro-course steps, track engagement/completion, and help creators see that people are actually consuming the content.

Do not let it become a CRM, LMS, AI chatbot, or generic automation platform by accident.
