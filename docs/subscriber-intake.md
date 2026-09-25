# Subscriber intake webhook

The subscriber intake endpoint lets a trusted external platform register a consenting contact and start a DripDesk campaign. It is organization-scoped and does not require an admin login from the sender.

## Set up

1. In Admin → Integrations → Subscriber intake webhook, generate a secret key. Copy it immediately: only its hash is saved, and the key cannot be retrieved later. Rotation invalidates the previous key.
2. Copy the POST endpoint shown there into the sending platform. Configure a JSON request with `Content-Type: application/json` and `X-DripDesk-Intake-Key: <secret key>`.
3. Copy the six-character campaign ID from the Campaigns list or the saved campaign's detail page. Letters are case-insensitive on input; DripDesk returns uppercase. Send a unique `eventId` for each signup and preserve that ID on retries. Supply the ID of an active campaign with at least one published step. The first step must use at least one contact channel supplied in the request.

The Integrations screen includes the endpoint, headers, and a copyable curl example. The key is shown only when first generated or rotated.

Example body:

```json
{
  "eventId": "checkout-signup-12345",
  "campaignId": "A1B2C3",
  "displayName": "Jordan Lee",
  "email": "jordan@example.com",
  "phone": "+15551234567",
  "timezone": "America/New_York",
  "tags": ["checkout"],
  "consent": true
}
```

`email`, `phone` (E.164), and `telegramChatId` (numeric chat ID) are optional individually, but at least one is required. `consent: true` attests that the sending platform has permission to contact this person; DripDesk does not collect proof of consent in v1. Never send a signup for someone who opted out.

Legacy UUID campaign IDs are not accepted after the six-character ID migration. Update any saved webhook configuration to the new ID shown in Campaigns.

The response contains `personId`, `enrollmentId`, `enrollmentStatus`, `created`, `alreadyEnrolled`, and `replayed` for a new event. An identical retry returns the original IDs with `replayed: true`. Reusing an event ID with different data returns 409. A contact already in the organization is matched by channel address, with new channels added only if no identity conflict exists. Opted-out/disabled channels, inactive people, and ambiguous multi-person matches return 409. A paused/completed enrollment is not silently restarted; a removed enrollment can be restarted using existing enrollment rules. The entire contact/enrollment/event write is transactional.

A successful intake creates an active enrollment and pending step states; it does **not** immediately send a message. The worker applies the campaign's schedule and the person's timezone (falling back to the organization default), so first delivery may be later than the webhook response. Delivery also requires a configured provider for the selected channel.

Keep the intake key server-side in the sending platform. Do not put it in browser JavaScript, public URLs, analytics, or logs. On a 5xx/network failure, retry the identical body with the same event ID; do not mint a new ID. Rate limit is 60 requests/minute per source IP. If higher-volume intake is needed, plan a queue-backed intake and per-organization limits.
