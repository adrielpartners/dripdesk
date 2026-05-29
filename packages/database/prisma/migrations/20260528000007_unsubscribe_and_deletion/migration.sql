CREATE TYPE "unsubscribe_event_type" AS ENUM (
  'campaign_unsubscribed',
  'global_unsubscribed',
  'deletion_requested'
);

CREATE TABLE "unsubscribe_tokens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "campaign_id" uuid,
  "enrollment_id" uuid,
  "message_outbox_id" uuid,
  "token_hash" text NOT NULL,
  "used_at" timestamptz(6),
  "expires_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "unsubscribe_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unsubscribe_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "campaign_id" uuid,
  "enrollment_id" uuid,
  "event_type" "unsubscribe_event_type" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "unsubscribe_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unsubscribe_tokens_token_hash_key" ON "unsubscribe_tokens" ("token_hash");
CREATE INDEX "unsubscribe_tokens_organization_id_idx" ON "unsubscribe_tokens" ("organization_id");
CREATE INDEX "unsubscribe_tokens_person_id_idx" ON "unsubscribe_tokens" ("person_id");
CREATE INDEX "unsubscribe_tokens_campaign_id_idx" ON "unsubscribe_tokens" ("campaign_id");
CREATE INDEX "unsubscribe_events_organization_id_event_type_idx" ON "unsubscribe_events" ("organization_id", "event_type");
CREATE INDEX "unsubscribe_events_person_id_idx" ON "unsubscribe_events" ("person_id");

ALTER TABLE "unsubscribe_tokens"
  ADD CONSTRAINT "unsubscribe_tokens_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_tokens"
  ADD CONSTRAINT "unsubscribe_tokens_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_tokens"
  ADD CONSTRAINT "unsubscribe_tokens_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_tokens"
  ADD CONSTRAINT "unsubscribe_tokens_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_tokens"
  ADD CONSTRAINT "unsubscribe_tokens_message_outbox_id_fkey"
  FOREIGN KEY ("message_outbox_id") REFERENCES "message_outbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unsubscribe_events"
  ADD CONSTRAINT "unsubscribe_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_events"
  ADD CONSTRAINT "unsubscribe_events_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_events"
  ADD CONSTRAINT "unsubscribe_events_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_events"
  ADD CONSTRAINT "unsubscribe_events_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
