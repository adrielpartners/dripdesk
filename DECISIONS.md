# DECISIONS.md

Version: 1.0  
Project: DripDesk  
Repository: `dripdesk`  
Last Updated: 2026-05-28

---

# Purpose

This file records major architectural and product decisions for DripDesk.

Use this file to prevent future developers or AI agents from relitigating settled choices or drifting DripDesk into a CRM, full LMS, generic automation platform, or unnecessarily complex marketing tool.

Each decision should include:

- decision
- rationale
- tradeoffs
- date adopted
- reversibility

---

# Decision 001: DripDesk is a mobile-first micro-course delivery SaaS

## Decision

DripDesk is a standalone SaaS product focused on delivering short course/lesson sequences through phone-first channels.

It is not a CRM, not a full marketing automation suite, not a hosted LMS, and not a visual node-based automation builder.

## Rationale

The product's core value is increasing content consumption and completion by delivering short lessons directly through channels people actually check.

This narrow identity keeps v1 focused and prevents feature bloat.

## Tradeoffs

- DripDesk will not satisfy every lifecycle marketing workflow.
- Some users may still need a CRM, LMS, or email platform alongside it.
- Advanced automation features are deferred.

## Date Adopted

2026-05-28

## Reversibility

Difficult after launch because product positioning, UX, and data model all depend on this scope.

---

# Decision 002: Build SaaS first, not WordPress plugin first

## Decision

V1 will be a standalone SaaS application.

Do not build a native WordPress plugin in v1.

## Rationale

Building both a WordPress plugin and hosted SaaS at the same time would split focus and increase architecture complexity.

The SaaS product can later expose an API that a WordPress plugin connects to.

## Tradeoffs

- WordPress-native advantages are delayed.
- Users must use the hosted SaaS app first.
- A future WP plugin will require a separate build plan.

## Date Adopted

2026-05-28

## Reversibility

Moderate. A plugin can be added later, but it should be a connector rather than a second product core.

---

# Decision 003: Use a monorepo

## Decision

DripDesk will use a monorepo.

Target top-level structure:

```text
apps/web
apps/api
apps/worker
packages/shared
packages/database
packages/config
docker
docs
```

## Rationale

DripDesk has multiple coordinated runtime pieces: Nuxt frontend, NestJS API, background worker, shared types, and database migrations.

A monorepo keeps shared types and documentation close while preserving app boundaries.

## Tradeoffs

- Requires monorepo discipline.
- Build tooling must be configured carefully.
- Agents must avoid cross-app coupling.

## Date Adopted

2026-05-28

## Reversibility

Moderate early, difficult later.

---

# Decision 004: Use Nuxt 3 / Vue 3 / TypeScript for frontend

## Decision

The frontend will use Nuxt 3, Vue 3, and TypeScript.

## Rationale

The frontend aligns with the preferred application stack and the user's existing Nuxt/Vue direction.

Nuxt is well suited for a clean SaaS dashboard and recipient portal.

## Tradeoffs

- React/Next ecosystem examples may not directly apply.
- Some AI builders default to React and may need stronger instructions.
- Vue/Nuxt hiring pool can be smaller than React in some markets.

## Date Adopted

2026-05-28

## Reversibility

Moderate before implementation, costly after UI buildout.

---

# Decision 005: Use Node + NestJS for backend API

## Decision

The backend API will use Node.js, NestJS, and TypeScript.

## Rationale

DripDesk needs structured backend modules, webhooks, background job orchestration, authentication, multi-tenant business logic, and integration services.

NestJS provides stronger architecture boundaries than raw Express.

## Tradeoffs

- This deviates from the default Nitro server preference.
- More backend structure than a small app might need.
- Requires NestJS module discipline.

## Date Adopted

2026-05-28

## Reversibility

Difficult after API modules and services are built.

---

# Decision 006: Use PostgreSQL for durable data

## Decision

PostgreSQL is the durable database for DripDesk.

## Rationale

DripDesk owns durable multi-tenant product data: users, organizations, campaigns, people, enrollments, messages, tracking, provider settings, and billing state.

PostgreSQL is stable, portable, inspectable, and appropriate for this product.

## Tradeoffs

- Requires migration discipline.
- Requires production backups.
- Analytics/event tables must be indexed carefully as volume grows.

## Date Adopted

2026-05-28

## Reversibility

Difficult after launch.

---

# Decision 007: Use Redis + BullMQ for queueing and workers

## Decision

Use Redis-backed background jobs, preferably BullMQ, with a separate worker process/container.

## Rationale

Message sending, scheduled delivery, provider retries, and event processing should not block API requests.

BullMQ fits the Node/NestJS stack and supports retries, delayed jobs, and separate workers.

## Tradeoffs

- Requires Redis.
- Requires queue monitoring and failure handling.
- Adds another runtime process.

## Date Adopted

2026-05-28

## Reversibility

Moderate. Another queue could be substituted, but job handling would need migration.

---

# Decision 008: Multi-tenancy from day one

## Decision

DripDesk will include organizations/tenants from the beginning.

## Rationale

Even if many accounts start as one-person teams, organizations prevent painful rewrites when adding teams, client accounts, agency usage, or billing boundaries.

## Tradeoffs

- More upfront data modeling.
- Every query must enforce tenant isolation.
- Authorization rules are more important from the start.

## Date Adopted

2026-05-28

## Reversibility

Should not be reversed.

---

# Decision 009: Use three roles in v1

## Decision

V1 roles are:

```text
owner
admin
recipient
```

## Rationale

These roles support the core product without overbuilding team permissions.

Owner handles organization and billing. Admin handles campaign operations. Recipient receives and reviews content.

## Tradeoffs

- No granular permissions in v1.
- No separate team member role yet.
- Some organizations may want more role control later.

## Date Adopted

2026-05-28

## Reversibility

Easy to extend later.

---

# Decision 010: Use email/password authentication in v1

## Decision

V1 includes email/password authentication for both admins and recipients.

Magic-link-only auth is not the v1 approach.

## Rationale

The user prefers standard login over login links and wants recipients and admins to have a straightforward way to access dashboards.

## Tradeoffs

- Requires password reset, secure hashing, and login security.
- Slightly more auth surface than magic links.
- Email verification and password reset flows must be handled carefully.

## Date Adopted

2026-05-28

## Reversibility

Easy to add magic links later as an alternative, not a replacement.

---

# Decision 011: Campaigns are linear in v1

## Decision

V1 campaigns are linear drip sequences.

No visual node builder and no branching logic in v1.

## Rationale

The key differentiator is simplicity. The admin should be able to add steps quickly without building automation flows.

## Tradeoffs

- Complex behavior is deferred.
- Some advanced automation users may need more.
- Schema must be designed carefully enough to support future branching.

## Date Adopted

2026-05-28

## Reversibility

Moderate. Branching can be added later if the schema preserves extension points.

---

# Decision 012: Support Standard Mode and limited Advanced Mode

## Decision

Campaigns support:

- Standard Mode for simple linear setup
- limited Advanced Mode for keyword reply requirements and per-step overrides

Advanced Mode must not become a full visual automation builder in v1.

## Rationale

Most users should have a clean default path, but some need reply keyword matching or step-specific timing.

## Tradeoffs

- More UI complexity than Standard Mode only.
- Requires careful progressive disclosure.
- Advanced Mode must be restrained.

## Date Adopted

2026-05-28

## Reversibility

Easy to refine.

---

# Decision 013: Progress triggers are time, click, or reply

## Decision

V1 progress rules are:

- time-based
- link-click required
- reply required

Reaction tracking is not included in v1.

## Rationale

Clicks and replies are broadly compatible across SMS, email, and Telegram. Reactions are inconsistent across channels.

## Tradeoffs

- No emoji/reaction-based progress in v1.
- Open tracking may be limited and channel-dependent.
- Completion measurement remains practical but not exhaustive.

## Date Adopted

2026-05-28

## Reversibility

Easy to add new trigger types later.

---

# Decision 014: Send on all enabled channels simultaneously in v1

## Decision

If a campaign has multiple default channels enabled and a Person has multiple enabled channels available, DripDesk sends on all enabled channels simultaneously.

No fallback/primary-channel routing in v1.

## Rationale

The product prioritizes engagement and completion. Multi-channel simultaneous delivery increases the chance that recipients see the lesson.

## Tradeoffs

- Some recipients may feel over-messaged.
- Users need clear channel preferences and unsubscribe controls.
- Fallback logic may be added later if needed.

## Date Adopted

2026-05-28

## Reversibility

Easy. Fallback behavior can later become a campaign setting.

---

# Decision 015: Use bring-your-own provider credentials in v1

## Decision

Organizations configure their own Twilio, Telegram Bot, and SMTP credentials.

DripDesk does not provide shared sending credentials in v1.

## Rationale

Using organization-owned provider accounts reduces platform liability, improves portability, and avoids subsidizing message costs before the business model is proven.

## Tradeoffs

- Setup requires more user effort.
- Support documentation and setup wizards matter.
- Some less-technical creators may need help configuring providers.

## Date Adopted

2026-05-28

## Reversibility

Moderate. Managed sending could be introduced later as a premium feature.

---

# Decision 016: No hosted lesson pages in v1

## Decision

DripDesk does not host lesson pages in v1.

Admins may include external links to Kajabi, WordPress, Dropbox, YouTube/Vimeo, private pages, or other hosted content.

## Rationale

Many users already have content hosted elsewhere. V1 should focus on delivery, tracking, and completion rather than becoming an LMS.

## Tradeoffs

- DripDesk cannot fully control lesson consumption analytics.
- “Lesson completed” may need to rely on link click or reply unless external integrations are added.
- User experience can vary based on external host quality.

## Date Adopted

2026-05-28

## Reversibility

Easy. Hosted lessons can be added later.

---

# Decision 017: Include a simple recipient dashboard

## Decision

Recipients have a simple dashboard where they can view enrolled campaigns, past steps, completed steps, and basic settings.

## Rationale

Recipients need a place to recover past lessons and manage their experience without relying only on message history.

## Tradeoffs

- Adds auth and UI scope.
- Adds recipient data-access rules.
- Must stay simple and mobile-first.

## Date Adopted

2026-05-28

## Reversibility

Moderate. Once available, removing it would hurt recipients.

---

# Decision 018: Use active-contact pricing

## Decision

Billing is based on active contacts.

Active contact definition:

```text
A Person enrolled in at least one campaign in the last 30 days.
```

Plans:

- Free: 10
- Core: 250
- Plus: 1000
- Pro: 5000
- Enterprise: custom

## Rationale

The value of DripDesk maps to people receiving content, not number of campaigns, steps, messages, or channels.

This avoids penalizing creators for making better or longer courses.

## Tradeoffs

- Active contact counting must be clear and trusted.
- High-message users may create provider cost/support concerns, though provider credentials are BYO in v1.
- Billing enforcement must be carefully designed.

## Date Adopted

2026-05-28

## Reversibility

Moderate, but pricing changes after launch can create customer confusion.

---

# Decision 019: Unsubscribe is campaign-scoped by default

## Decision

Unsubscribe links default to unsubscribing the recipient from the current campaign.

The unsubscribe page also offers:

- unsubscribe from all campaigns
- delete my account

## Rationale

Campaign-scoped unsubscribe is less destructive and gives recipients control.

The broader options provide compliance-friendly escape routes.

## Tradeoffs

- More unsubscribe state complexity.
- Messaging must make scope clear.
- Global suppression must be respected everywhere.

## Date Adopted

2026-05-28

## Reversibility

Easy to adjust but should be handled carefully.

---

# Decision 020: Delete account is a soft deletion request in v1

## Decision

When recipients choose “Delete my account,” DripDesk disables sending and login, marks the record as deletion requested, but does not immediately hard-delete database records.

Admins can archive or permanently delete later if implemented.

## Rationale

Soft deletion preserves operational records and prevents accidental destructive removal while immediately respecting the user's intent to stop sending and disable access.

## Tradeoffs

- Requires clear admin handling.
- Privacy policy must match behavior.
- Permanent deletion workflow needs future care.

## Date Adopted

2026-05-28

## Reversibility

Moderate. Hard-delete behavior can be added later.

---

# Decision 021: Marketing site is out of scope for current build

## Decision

Do not build the marketing site in the current software build.

## Rationale

The current priority is the application itself: admin dashboard, recipient dashboard, campaign engine, integrations, billing, and delivery.

## Tradeoffs

- Product may not have public-facing marketing pages initially.
- Go-to-market content is handled separately.

## Date Adopted

2026-05-28

## Reversibility

Easy. Marketing site can be added later as a separate app or page set.

---

# Decision 022: Use Prisma for database schema, migrations, and generated client

## Decision

DripDesk will use Prisma for the initial database schema, migration files, and generated TypeScript database client.

## Rationale

The repository already used Prisma, the package structure was built around `packages/database`, and Prisma gives this early monorepo a consistent migration workflow and generated types while the domain model is still being established.

The schema must still stay explicit, readable, and aligned with PostgreSQL table names. Prisma models should map to snake_case plural database tables and snake_case columns where practical.

## Tradeoffs

- Prisma is heavier than hand-written SQL.
- Generated client types can temporarily break API code when the schema is intentionally narrowed or refactored.
- Prisma migration files live under `packages/database/prisma/migrations`, which differs from the earlier generic folder sketch.

## Date Adopted

2026-05-28

## Reversibility

Moderate early, difficult after many migrations and repositories depend on Prisma-generated types.

---

# Decision 023: Use JWT bearer auth for the foundation API

## Decision

The current foundation API uses email/password authentication with signed JWT bearer tokens.

## Rationale

JWT bearer auth fits the existing NestJS scaffold, keeps the early API simple, and gives the web app a straightforward way to authenticate requests while organization membership and role checks are being built.

Password hashes are stored using a salted scrypt hash with the configured password pepper. Password reset tokens are stored hashed and expire.

## Tradeoffs

- Logout is client-side token discard in the current foundation, not server-side token revocation.
- Token revocation or session tables may be added later if risk or product needs require them.
- Cookie/session hardening still needs review before production.

## Date Adopted

2026-05-28

## Reversibility

Moderate. The API can move to server-side sessions later, but guards, clients, and auth flows would need coordinated changes.
