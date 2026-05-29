CREATE TYPE "enrollment_status" AS ENUM ('active', 'paused', 'completed', 'removed');

CREATE TYPE "enrollment_step_state_status" AS ENUM (
  'pending',
  'sent',
  'delivered',
  'clicked',
  'replied',
  'completed',
  'failed',
  'skipped',
  'unsubscribed'
);

CREATE TABLE "enrollments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "status" "enrollment_status" NOT NULL DEFAULT 'active',
  "current_step_order" integer NOT NULL DEFAULT 1,
  "enrolled_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paused_at" timestamptz(6),
  "removed_at" timestamptz(6),
  "completed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollment_step_states" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "enrollment_id" uuid NOT NULL,
  "campaign_step_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "status" "enrollment_step_state_status" NOT NULL DEFAULT 'pending',
  "sent_at" timestamptz(6),
  "delivered_at" timestamptz(6),
  "clicked_at" timestamptz(6),
  "replied_at" timestamptz(6),
  "completed_at" timestamptz(6),
  "failed_at" timestamptz(6),
  "skipped_at" timestamptz(6),
  "unsubscribed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "enrollment_step_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enrollments_person_id_campaign_id_key" ON "enrollments" ("person_id", "campaign_id");
CREATE INDEX "enrollments_organization_id_status_idx" ON "enrollments" ("organization_id", "status");
CREATE INDEX "enrollments_campaign_id_status_idx" ON "enrollments" ("campaign_id", "status");
CREATE INDEX "enrollments_person_id_status_idx" ON "enrollments" ("person_id", "status");
CREATE INDEX "enrollments_organization_id_enrolled_at_idx" ON "enrollments" ("organization_id", "enrolled_at");

CREATE UNIQUE INDEX "enrollment_step_states_enrollment_id_campaign_step_id_key" ON "enrollment_step_states" ("enrollment_id", "campaign_step_id");
CREATE INDEX "enrollment_step_states_enrollment_id_status_idx" ON "enrollment_step_states" ("enrollment_id", "status");
CREATE INDEX "enrollment_step_states_campaign_step_id_idx" ON "enrollment_step_states" ("campaign_step_id");

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollment_step_states"
  ADD CONSTRAINT "enrollment_step_states_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollment_step_states"
  ADD CONSTRAINT "enrollment_step_states_campaign_step_id_fkey"
  FOREIGN KEY ("campaign_step_id") REFERENCES "campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
