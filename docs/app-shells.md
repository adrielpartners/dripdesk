# App Shells and Navigation

Phase 7 adds the initial Nuxt route skeletons for admin and recipient experiences.

## Auth Session

The web app stores the current bearer token and public user object in local storage under:

```text
dripdesk.auth.session
```

The session helper lives in:

```text
apps/web/composables/use-auth-session.ts
```

The helper is a web navigation convenience only. Server-side authorization remains mandatory in the API.

Because the current web shell stores session state in local storage, route middleware evaluates on the client. Direct SSR requests may render the shell briefly before client navigation applies the redirect.

## Route Guards

Route middleware lives in:

```text
apps/web/middleware/
```

Current middleware:

- `admin`: requires an authenticated owner/admin session and redirects recipients to `/recipient`.
- `recipient`: requires an authenticated recipient session and redirects owners/admins to `/admin`.
- `guest`: redirects already-authenticated users away from `/login`.

Unauthenticated users are sent to `/login?redirect=...`.

## Admin Routes

Current admin shell routes:

- `/admin`
- `/admin/campaigns`
- `/admin/persons`
- `/admin/settings/integrations`
- `/admin/billing`

These routes are placeholders only. Persons, campaigns, integrations, and billing behavior remain assigned to later phases.

## Recipient Routes

Current recipient shell routes:

- `/recipient`
- `/recipient/campaigns/:id`
- `/recipient/settings`

These routes are placeholders only. Recipient campaign data, channel preferences, unsubscribe, and deletion request behavior remain assigned to later phases.
