# Campaigns and Steps

Phase 9 adds the first tenant-owned campaign builder data.

## Database

Tables:

- `campaigns`
- `campaign_steps`

`campaigns` owns the linear micro-course setup inside an organization. It includes:

- `organization_id`
- `created_by_id`
- name and optional description
- status: `draft`, `active`, `paused`, `completed`, or `archived`
- schedule type and optional schedule config
- progress rule
- mode: `standard` or `advanced`
- default channels: `sms`, `telegram`, and/or `email`
- activation and archive timestamps

`campaign_steps` owns ordered lesson/message content for one campaign. It includes:

- `campaign_id`
- `step_order`
- title
- status: `draft`, `published`, or `archived`
- default content
- SMS content
- Telegram content
- email subject and body
- optional per-step delay override
- optional channel overrides
- optional reply-required phrases

Every campaign and step query must include organization context. Steps are scoped through their parent campaign.

## API

Admin-only campaign routes:

- `GET /campaigns`
- `POST /campaigns`
- `GET /campaigns/:id`
- `PATCH /campaigns/:id`
- `POST /campaigns/:id/activate`
- `DELETE /campaigns/:id`

Admin-only step routes:

- `GET /campaigns/:campaignId/steps`
- `POST /campaigns/:campaignId/steps`
- `POST /campaigns/:campaignId/steps/reorder`
- `PATCH /steps/:id`
- `DELETE /steps/:id`

Routes require:

```text
JwtAuthGuard
CurrentOrganizationGuard
RolesGuard(owner/admin)
```

Campaign activation is server-side only. A campaign cannot activate unless it has a name, at least one default channel, and at least one active step with content. Published steps require a title and at least one content field.

## UI

Admin UI routes:

- `/admin/campaigns`
- `/admin/campaigns/:id`

The UI supports listing campaigns, creating a campaign, editing setup fields, adding steps, saving draft steps, saving and adding another step, saving and closing the editor, reordering a vertical step list, publishing steps, activating valid campaigns, and archiving campaigns.

Advanced mode reveals reply-required phrase fields. There is no branching or visual automation builder in Phase 9.

## Deferred

Campaign enrollment, active contact billing, due-step scheduling, delivery, tracking, replies, completion evaluation, and recipient campaign views remain later-phase work.
