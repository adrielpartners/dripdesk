# Provider Integrations

Phase 15 adds bring-your-own provider credentials and real channel sending.

## Credentials

Provider credentials are stored in `provider_credentials`.

Supported providers:

- `twilio`
- `telegram`
- `smtp`

Credential payloads are encrypted at rest with `DRIPDESK_ENCRYPTION_KEY`. API reads return masked configuration only. Saved Twilio auth tokens, Telegram bot tokens, SMTP passwords, and webhook secrets must never be logged or returned to the frontend.

## Admin Setup

The admin integration screen supports:

- Twilio account SID, auth token, and from number
- Telegram bot token and optional webhook secret
- SMTP host, port, username, password, from email, from name, and presets for Brevo, SendGrid, Mailgun, and generic SMTP

Each card shows its own success, warning, or failure notice above the card. Admins can enter a test phone number (international `+` format), numeric Telegram chat ID, or email address and send a test message to that recipient. The saved credentials must be configured first. The API validates the recipient and credential shape, then queues a single-attempt `test-provider` job. The worker uses the same Twilio, Telegram, or SMTP transport as campaign delivery and marks the credential `verified` only after provider acceptance; rejected sends mark it `failed` with a safe error. The UI polls the job result and distinguishes queued, accepted, and failed outcomes. Acceptance does not guarantee final delivery to the inbox or device. Test messages do not create campaign outbox records or advance enrollments.

Tests require real provider credentials and network access. Telegram recipients must have started a chat with the bot before the bot can send to their chat ID.
SMTP uses implicit TLS when the secure setting/port 465 is selected, and upgrades with STARTTLS for port 587 or any authenticated non-implicit-TLS connection. It does not send SMTP authentication over an unencrypted connection.

## Sending

Worker `send-message` jobs:

- prepare the outbox message
- load encrypted organization credentials for the message channel
- send through Twilio, Telegram Bot API, or SMTP
- mark `message_outbox.status` as `sent` or `failed`
- write `sent` or `failed` message events with normalized safe errors

## Webhooks

Twilio:

- `POST /api/webhooks/twilio/status`
- `POST /api/webhooks/twilio/reply`

Telegram:

- `POST /api/webhooks/telegram/:orgId`

Telegram validates `x-telegram-bot-api-secret-token` when a webhook secret is configured. Twilio status and reply handling resolves the organization from the webhook `AccountSid` and receiving `To` number, then validates `x-twilio-signature` against the organization-owned Twilio auth token before writing events.

Inbound replies update the current enrollment step state, write `replied` events, and call `ProgressService`.

## Telegram Linking

The v1 linking pattern is manual: the person Telegram channel address stores the Telegram chat id. Automated recipient deep-link onboarding remains a future enhancement.
