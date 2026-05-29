CREATE TYPE "billing_status" AS ENUM ('trial', 'active', 'past_due', 'canceled', 'inactive');

CREATE TABLE "billing_subscriptions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "plan_id" text NOT NULL DEFAULT 'free',
  "status" "billing_status" NOT NULL DEFAULT 'inactive',
  "active_contact_limit" integer,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamptz(6),
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_subscriptions_organization_id_key"
  ON "billing_subscriptions" ("organization_id");

CREATE UNIQUE INDEX "billing_subscriptions_stripe_subscription_id_key"
  ON "billing_subscriptions" ("stripe_subscription_id");

CREATE INDEX "billing_subscriptions_organization_id_status_idx"
  ON "billing_subscriptions" ("organization_id", "status");

CREATE INDEX "billing_subscriptions_stripe_customer_id_idx"
  ON "billing_subscriptions" ("stripe_customer_id");

ALTER TABLE "billing_subscriptions"
  ADD CONSTRAINT "billing_subscriptions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
