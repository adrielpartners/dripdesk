# Security Review

Phase 21 reviews high-risk areas before serious use.

## Reviewed Areas

Password hashing:

- Admin and recipient passwords use salted scrypt hashes.
- `DRIPDESK_PASSWORD_PEPPER` is included in derivation and must be a production secret.

Session/JWT security:

- Current auth uses JWT bearer tokens.
- `DRIPDESK_SESSION_SECRET` is required in production by config validation.
- Token revocation and refresh-token rotation are not implemented in v1.

Tenant isolation:

- Admin organization routes use `CurrentOrganizationGuard` and `TenantContext`.
- Recipient portal routes resolve access from authenticated `persons.user_id` and do not accept client organization IDs.

Provider credentials:

- Provider credentials are encrypted through the database credential store.
- API responses expose masked configuration only.

Stripe webhooks:

- Billing webhooks verify Stripe signatures with `DRIPDESK_STRIPE_WEBHOOK_SECRET` before subscription changes are applied.

Twilio/Telegram webhooks:

- Telegram supports an organization-scoped shared webhook secret when configured.
- Twilio webhook handling resolves tenant context from the configured Twilio account SID and receiving number.
- Twilio status/reply webhooks validate `x-twilio-signature` against the organization-owned Twilio auth token before writing events.

Tracking/unsubscribe tokens:

- Tracking links use opaque random tokens.
- Unsubscribe tokens are stored as SHA-256 hashes; raw tokens are not stored.

Rate limiting:

- API has global throttling configured.
- Auth endpoints have tighter route-level throttles for registration, login, and password reset requests.

CORS:

- API CORS is restricted to `DRIPDESK_PUBLIC_WEB_URL`.

Logging:

- Generic exceptions are returned as internal errors.
- Provider secrets are not intentionally logged.
- Inbound reply text is stored in message-event metadata because reply-based completion needs message content; this is a privacy risk to revisit with retention rules.

Dependency vulnerabilities:

- The unused legacy API `nodemailer` dependency was removed after review.
- NestJS packages were upgraded to the current 11.x line.
- Reviewed `pnpm` overrides pin patched transitive dependency versions for known vulnerable package chains.
- `pnpm audit` now reports no known vulnerabilities.

Production configuration:

- Production startup requires public web/API URLs, database, Redis, auth/encryption secrets, Stripe secret, Stripe webhook secret, and Stripe price IDs.
- Swagger API docs are disabled by default in production unless `DRIPDESK_ENABLE_API_DOCS=true` is explicitly set.
- API enables Express trust proxy in production so reverse-proxy deployments can report client IPs correctly for throttling/logging.

## Production Blockers

- Confirm deployment secrets are unique and not dev defaults.
- Run live Stripe webhook signature tests.
- Run Docker image builds and live smoke tests in an environment with Docker, Postgres, Redis, and provider sandboxes.
