# Enrollments and Active Contacts

Phase 10 connects people to campaigns and introduces active contact limit enforcement.

This page records the Phase 10 foundation. Scheduling, provider delivery, progress evaluation, recipient views, and persisted Stripe billing were added later. See the corresponding feature docs and `docs/release-checklist.md` for unverified production flows.

## Database

Tables:

- `enrollments`
- `enrollment_step_states`

`enrollments` connects one person to one campaign inside an organization. It includes:

- `organization_id`
- `campaign_id`
- `person_id`
- status: `active`, `paused`, `completed`, or `removed`
- `current_step_order`, defaulting to `1`
- enrollment, pause, removal, and completion timestamps

`enrollment_step_states` stores per-enrollment progress records for campaign steps. Enrollment initializes one state per currently published campaign step. The scheduler, worker, tracking, reply handling, and completion updates were implemented in later phases.

Every enrollment query must include organization context. Campaign and person enrollment lists are scoped through the same `organization_id`.

## Active Contacts

Active contact definition:

```text
A Person enrolled in at least one campaign in the last 30 days.
```

The Free plan default limit is 10 active contacts. Persisted subscription plan data and Stripe billing are now implemented; see `docs/billing.md`.

## API

Admin-only routes:

- `GET /enrollments/usage`
- `GET /campaigns/:campaignId/enrollments`
- `POST /campaigns/:campaignId/enrollments`
- `GET /persons/:personId/enrollments`
- `POST /persons/:personId/enrollments`
- `POST /enrollments/:id/pause`
- `DELETE /enrollments/:id`

Routes require:

```text
JwtAuthGuard
CurrentOrganizationGuard
RolesGuard(owner/admin)
```

Enrollment rules:

- Campaign must belong to the current organization.
- Person must belong to the current organization.
- Campaign must be active.
- Campaign must have at least one published step.
- Duplicate person/campaign enrollments return a conflict unless the previous enrollment was removed.
- Active contact limit is checked before creating or reactivating an enrollment.

## UI

Admin UI routes now expose enrollment controls on:

- `/admin/campaigns/:id`
- `/admin/persons/:id`

Campaign detail supports adding a person to a campaign, listing campaign enrollments, pausing enrollment, removing enrollment, showing current step, and showing active contact usage.

Person detail supports adding the person to an active campaign and listing that person's enrollments.

## Current verification gap

The local campaign smoke test covers enrollment, queue delivery to Mailpit, and completion. Production subscriber intake through external email/SMS delivery and later scheduled steps remains to be verified; see `docs/release-checklist.md`.
