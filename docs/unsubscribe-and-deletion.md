# Unsubscribe and Deletion Requests

Phase 16 gives recipients token-based control over message preferences.

## Tokens

Outbound messages include:

```text
{DRIPDESK_PUBLIC_WEB_URL}/unsubscribe/{token}
```

Only a SHA-256 hash of the token is stored in `unsubscribe_tokens`. Raw tokens are not stored in the database.

## Actions

Supported public actions:

- campaign unsubscribe
- global unsubscribe
- deletion request

Campaign unsubscribe removes the scoped active enrollment and marks related step states `unsubscribed`.

Global unsubscribe disables all person channels, marks channels unsubscribed, and removes all active enrollments for the person.

Deletion request marks the person `deletion_requested`, suppresses and unsubscribes all channels, removes active enrollments, and blocks future recipient login for linked recipient users.

## Sending Rules

Future sends are blocked in three places:

- scheduler ignores inactive/deletion-requested persons
- message preparation rejects inactive persons and unsubscribed/suppressed channels
- provider send rejects inactive persons and disabled/unsubscribed/suppressed channels

## Admin Visibility

Deletion-requested persons remain visible in admin people lists with their status. V1 does not hard-delete recipient records.
