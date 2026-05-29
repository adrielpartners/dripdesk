# Persons and Channels

Phase 8 adds the first tenant-owned recipient/contact data.

## Database

Tables:

- `persons`
- `person_channels`

`persons` owns the recipient/contact identity inside an organization. It includes:

- `organization_id`
- optional linked `user_id`
- `display_name`
- optional `timezone`
- `status`
- text-array `tags`
- deletion-request and archive timestamps

`person_channels` owns reachable v1 delivery identifiers. It includes:

- `organization_id`
- `person_id`
- `channel_type`: `sms`, `telegram`, or `email`
- `address`
- verification status
- enabled flag
- unsubscribe/suppression flags
- provider metadata placeholder

Every person and channel query must include organization context.

## API

Admin-only routes:

- `GET /persons`
- `POST /persons`
- `GET /persons/:id`
- `PATCH /persons/:id`
- `DELETE /persons/:id`
- `POST /persons/:id/request-deletion`
- `POST /persons/:id/channels`
- `PATCH /persons/:id/channels/:channelId`

Routes require:

```text
JwtAuthGuard
CurrentOrganizationGuard
RolesGuard(owner/admin)
```

Recipients do not receive organization-admin person endpoints in Phase 8.

## Validation

Channel validation is server-side:

- email must look like a valid email address
- sms must use E.164 format
- telegram must use a constrained identifier format

The database enforces uniqueness for a channel address within an organization and channel type.

## UI

Admin UI routes:

- `/admin/persons`
- `/admin/persons/:id`

The UI supports listing, creating, editing, archiving, deletion-request marking, adding channels, and enabling/disabling channels.

Campaign enrollment, active contact billing, unsubscribe actions, and provider verification remain later-phase work.

