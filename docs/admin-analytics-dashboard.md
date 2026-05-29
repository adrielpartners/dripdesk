# Admin Analytics Dashboard

Phase 17 adds a completion-focused admin dashboard.

## API

Admin-only route:

- `GET /dashboard`

The route requires:

```text
JwtAuthGuard
CurrentOrganizationGuard
RolesGuard(owner/admin)
```

The controller stays thin and passes `TenantContext` to `DashboardService`.

## Metrics

Top-level metrics:

- Active Contacts: distinct people with at least one active enrollment created in the last 30 days.
- Average Open Rate: opened message events divided by sent outbox messages.
- Average Click Rate: clicked message events divided by sent outbox messages.
- Average Completion Rate: completed enrollments divided by non-removed enrollments.

Rates return `0` when there is no denominator and are capped at `100` to avoid inflated display values from repeated provider or tracking events.

Campaign performance rows include:

- active enrolled count
- open rate
- click rate
- completion rate
- last sent timestamp

## Query Bounds

Dashboard data is always tenant-scoped by `organization_id`.

The campaign performance list is capped at 20 most recently updated, non-archived campaigns. Per-campaign event counts run only for that bounded list.

The dashboard uses aggregate counts and relation-filtered event counts rather than loading message bodies, recipients, or full event lists.

## UI

The admin dashboard at `/admin` shows:

- four metric cards
- a campaign performance table
- error state
- empty account guidance
- no-activity guidance

Recipient dashboard behavior remains deferred to Phase 18.
