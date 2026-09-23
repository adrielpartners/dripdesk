# Security Review

Phase 21 reviews high-risk areas before serious use. This records implementation checks and open verification, not a completed production security certification. Last reviewed: 2026-09-23.

## Reviewed Areas

Password hashing:

- Admin and recipient passwords use salted scrypt hashes.
- `DRIPDESK_PASSWORD_PEPPER` is included in derivation and must be a production secret.

Session/JWT security:

- Current auth uses JWT bearer tokens.
- `DRIPDESK_SESSION_SECRET` is required in production by config validation.
- JWTs include a database-backed session version. Logout increments it and revokes all of that user's outstanding access tokens; password reset also increments it. This requires the `20260923000001_session_version` migration before deploying the new API. Existing tokens without a version will require users to sign in again. Per-device revocation and refresh-token rotation are not implemented.
- The browser still stores a seven-day bearer token in localStorage. This leaves exposure to script injection on the app origin; an HttpOnly-cookie session design remains a security follow-up.

Tenant isolation:

- Admin organization routes use `CurrentOrganizationGuard` and `TenantContext`.
- Recipient portal routes resolve access from authenticated `persons.user_id` and do not accept client organization IDs.

Provider credentials:

- Provider credentials are encrypted through the database credential store.
- API responses expose masked configuration only.

Stripe webhooks:

- Billing webhooks verify Stripe signatures with `DRIPDESK_STRIPE_WEBHOOK_SECRET` before subscription changes are applied.

Twilio/Telegram webhooks:

- Telegram requires an organization-scoped webhook secret. Missing or invalid secrets are rejected before a reply can affect enrollment state. Existing Telegram configurations without a secret must be updated before inbound replies will work.
- Twilio webhook handling resolves tenant context from the configured Twilio account SID and receiving number; ambiguous SID/number matches fail closed.
- Twilio status/reply webhooks validate `x-twilio-signature` against the organization-owned Twilio auth token before writing events.

Tracking/unsubscribe tokens:

- Tracking links use opaque random tokens.
- Unsubscribe tokens are stored as SHA-256 hashes; raw tokens are not stored.

Subscriber intake:

- The organization-scoped intake endpoint requires a generated key, explicit consent, and an external event ID. Only the key hash is stored; identical event retries return the prior result and changed replays conflict.
- Live external-platform intake, duplicate retries, and ensuing campaign delivery have not yet been verified end to end.

Rate limiting:

- API has global throttling configured.
- Auth endpoints have tighter route-level throttles for registration, login, and password reset requests.

CORS:

- API CORS is restricted to `DRIPDESK_PUBLIC_WEB_URL`.
- The browser may send `X-DripDesk-Organization-Id` for tenant-scoped requests; API preflight explicitly allows this header.

Logging:

- Generic exceptions are returned as internal errors.
- Provider secrets are not intentionally logged.
- Inbound reply text is stored in message-event metadata because reply-based completion needs message content; this is a privacy risk to revisit with retention rules.

Dependency vulnerabilities:

- The worker uses Nodemailer for SMTP framing, TLS, and plain-text MIME messages. It rejects line breaks in header/address fields and has regression coverage for dot-stuffing and header injection. This replaces the unsafe hand-written SMTP socket implementation; the worker dependency is intentional.
- NestJS packages were upgraded to the current 11.x line.
- Reviewed `pnpm` overrides pin patched transitive dependency versions for known vulnerable package chains.
- A fresh `pnpm audit` on 2026-09-23 still reported 58 advisories: 2 critical, 33 high, 17 moderate, and 6 low. The `--prod` audit reported 49: 2 critical, 24 high, 17 moderate, and 6 low. These counts remain open; adding Nodemailer and ESLint did not change the totals.
- The two critical audit paths involve `tar` through Nuxt/Nitro's packaging dependencies and `@nuxt/devtools` through Nuxt. These are dependency-audit classifications, not proof either issue is reachable in the running production app. Triage exact package versions, runtime exposure, and safe upgrade/override paths before release; do not suppress the findings without evidence.

Production configuration:

- Production startup requires public web/API URLs, database, Redis, and auth/encryption secrets. Stripe secrets and price IDs are optional at startup; checkout and live billing require them to be configured before use.
- Swagger API docs are disabled by default in production unless `DRIPDESK_ENABLE_API_DOCS=true` is explicitly set.
- API enables Express trust proxy in production so reverse-proxy deployments can report client IPs correctly for throttling/logging.

## Production Blockers

- Confirm deployment secrets are unique and not dev defaults.
- Run live Stripe webhook signature tests.
- Triage and resolve or explicitly risk-assess the current dependency advisories, including the two critical paths.
- Verify production subscriber intake through scheduled email/SMS campaign sends, provider outcomes, and retry idempotency. Local Docker/Mailpit campaign smoke tests passed on 2026-09-22, but they do not prove external delivery.
- Verify live Stripe webhook signature handling and checkout behavior.
- Verify database backup and restore procedures and production secret values. Do not record secret values in this document.
- Rebuild and verify the API/worker images with OpenSSL and a `.node` query-engine filename before applying the new session-version migration; the prior deployed API image required a temporary one-off OpenSSL installation for Prisma CLI migrations. A review image exposed the incorrect `.so` filename, and the corrected Dockerfiles still need a build/runtime check.
