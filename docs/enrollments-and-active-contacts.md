# Enrollments and Active Contacts

Phase 10 connects people to campaigns and introduces active contact limit enforcement.

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

`enrollment_step_states` stores per-enrollment progress records for campaign steps. Phase 10 initializes one state per currently published campaign step when a person is enrolled. Scheduler, delivery, tracking, reply handling, and completion updates remain later-phase work.

Every enrollment query must include organization context. Campaign and person enrollment lists are scoped through the same `organization_id`.

## Active Contacts

Active contact definition:

```text
A Person enrolled in at least one campaign in the last 30 days.
```

Phase 10 enforces the Free plan default limit of 10 active contacts. Persisted subscription plan data and Stripe billing remain later-phase work.

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

## Deferred

Campaign scheduling, message delivery, due-step detection, active contact paid-plan storage, Stripe subscription enforcement, recipient campaign views, progress advancement, click/reply completion rules, and analytics remain later-phase work.
