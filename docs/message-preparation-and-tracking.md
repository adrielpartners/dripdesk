# Message Preparation and Tracking

Phase 13 prepares outbound messages and records tracked-link clicks. It does not send provider messages or evaluate progress completion.

## Message Preparation

The worker handles `send-message` jobs by:

- loading the enrollment, campaign, step, person, and recipient channels
- selecting the channel-specific step variant
- replacing supported merge tags
- creating a `message_outbox` record
- rewriting `http` and `https` links to tracked URLs
- recording a `prepared` message event
- sending the prepared message through the configured organization provider
- recording a `sent` or `failed` message event
- appending a token-safe unsubscribe/preferences link

Supported merge tags:

```text
{{person.name}}
{{campaign.name}}
{{step.title}}
```

Outbox preparation is unique per enrollment, campaign step, and channel type. If the same job is retried, the existing outbox record is reused.

## Channel Variants

Variant fallback:

- email uses `email_body`, with `default_content` fallback, and subject fallback to the step title
- SMS uses `sms_content`, with `default_content` fallback
- Telegram uses `telegram_content`, with `default_content` fallback

If no body content exists for the selected channel, preparation fails visibly so the queue retry policy can handle the job.

## Provider Sending

Phase 15 sends prepared messages through:

- Twilio for SMS
- Telegram Bot API for Telegram
- SMTP for email

Provider credentials are loaded from encrypted organization-owned `provider_credentials` records. Provider secrets are not logged and are not returned to the frontend after storage.

Provider sends are skipped when the person is no longer active or the target channel is disabled, unsubscribed, or suppressed.

## Tracked Links

Links are stored in `tracked_links` with organization, enrollment, campaign, step, person, and optional outbox context.

Prepared message bodies use:

```text
{DRIPDESK_PUBLIC_API_URL}/api/l/{token}
```

The token is an opaque random value. Tracking URLs must not include raw organization IDs, enrollment IDs, step IDs, person IDs, provider credentials, or other secrets.

## Redirects

The public API route is:

```text
GET /api/l/:token
```

On click, the API:

- resolves the token
- rejects unknown or expired links
- rejects non-HTTP(S) redirect targets
- increments the link click count
- records a `clicked` message event
- updates the enrollment step state's `clicked_at` timestamp
- evaluates progress through `ProgressService`
- redirects to the original URL

Provider reply ingestion remains later-phase work. When reply events exist, `ProgressService` can evaluate any-reply and keyword/phrase completion.
