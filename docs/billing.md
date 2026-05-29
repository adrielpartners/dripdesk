# Billing

Phase 19 adds contact-based billing state and Stripe webhook handling.

## Plans

Billing is based only on active contacts.

Plans:

- Free: 10 active contacts
- Core: 250 active contacts
- Plus: 1000 active contacts
- Pro: 5000 active contacts
- Enterprise: custom

The active contact definition remains:

```text
A distinct Person with at least one active enrollment created in the last 30 days.
```

## Data

Billing state is stored in `billing_subscriptions`.

The table is tenant-owned by `organization_id` and stores:

- plan ID
- billing status
- active contact limit
- Stripe customer ID
- Stripe subscription ID
- current period end
- cancel-at-period-end flag

## API

Routes:

- `GET /billing/plans`
- `GET /billing/usage`
- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /billing/webhook`

Usage, checkout, and portal routes require authenticated owner/admin organization context. Checkout and portal are owner-only.

Stripe subscription status is updated by `POST /billing/webhook`, which verifies the Stripe signature before applying subscription updates.

## Enforcement

Enrollment creation checks the current organization's `billing_subscriptions.active_contact_limit`.

If no subscription row exists, the API creates and uses the Free plan default.

Enterprise/custom plans use a `null` active contact limit and are not blocked by contact count.

## Configuration

Stripe environment variables:

```text
DRIPDESK_STRIPE_SECRET_KEY
DRIPDESK_STRIPE_WEBHOOK_SECRET
DRIPDESK_STRIPE_CORE_PRICE_ID
DRIPDESK_STRIPE_PLUS_PRICE_ID
DRIPDESK_STRIPE_PRO_PRICE_ID
```

Self-serve checkout is available only when the Stripe secret key and the selected plan's Stripe price ID are configured.
