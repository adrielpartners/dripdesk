# Recipient Dashboard

Phase 18 adds authenticated recipient dashboard behavior.

## API

Recipient-only routes:

- `GET /portal`
- `GET /portal/campaigns/:campaignId`
- `GET /portal/settings`
- `POST /portal/campaigns/:campaignId/unsubscribe`
- `POST /portal/unsubscribe-all`

Routes require:

```text
JwtAuthGuard
RolesGuard(recipient)
```

Recipient routes do not accept organization IDs from the client. They resolve recipient access from the authenticated user and `persons.user_id`.

## Behavior

Recipients can see:

- their own enrolled campaigns
- campaign progress
- completed step counts
- step status and delivered message/content history
- channel settings
- unsubscribe controls

Recipients cannot see other recipients' campaigns because every query is filtered through the authenticated user's linked `Person` records.

Deletion-requested recipient records are excluded from active dashboard data. Recipient login is already blocked for deletion-requested records by the auth service.

## Unsubscribe

The recipient dashboard supports:

- campaign unsubscribe for an active enrollment
- global unsubscribe for all linked recipient records

Both actions mark active enrollment work removed/unsubscribed and create `unsubscribe_events` records.
