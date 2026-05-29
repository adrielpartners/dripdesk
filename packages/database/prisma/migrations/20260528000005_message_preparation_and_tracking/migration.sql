CREATE TYPE "message_outbox_status" AS ENUM ('prepared', 'sending', 'sent', 'failed');

CREATE TYPE "message_event_type" AS ENUM (
  'queued',
  'prepared',
  'sent',
  'delivered',
  'failed',
  'opened',
  'clicked',
  'replied',
  'completed',
  'unsubscribed'
);

CREATE TABLE "message_outbox" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "enrollment_id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "campaign_step_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "person_channel_id" uuid NOT NULL,
  "channel_type" "person_channel_type" NOT NULL,
  "status" "message_outbox_status" NOT NULL DEFAULT 'prepared',
  "subject" text,
  "body" text NOT NULL,
  "provider" text,
  "provider_message_id" text,
  "prepared_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" timestamptz(6),
  "failed_at" timestamptz(6),
  "error_message" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "message_outbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tracked_links" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "enrollment_id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "campaign_step_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "message_outbox_id" uuid,
  "token" text NOT NULL,
  "original_url" text NOT NULL,
  "expires_at" timestamptz(6),
  "clicked_at" timestamptz(6),
  "click_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "tracked_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "enrollment_id" uuid,
  "message_outbox_id" uuid,
  "tracked_link_id" uuid,
  "event_type" "message_event_type" NOT NULL,
  "metadata" jsonb,
  "occurred_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_outbox_enrollment_id_campaign_step_id_channel_type_key"
  ON "message_outbox" ("enrollment_id", "campaign_step_id", "channel_type");
CREATE INDEX "message_outbox_organization_id_status_idx" ON "message_outbox" ("organization_id", "status");
CREATE INDEX "message_outbox_enrollment_id_idx" ON "message_outbox" ("enrollment_id");
CREATE INDEX "message_outbox_campaign_step_id_idx" ON "message_outbox" ("campaign_step_id");

CREATE UNIQUE INDEX "tracked_links_token_key" ON "tracked_links" ("token");
CREATE INDEX "tracked_links_organization_id_idx" ON "tracked_links" ("organization_id");
CREATE INDEX "tracked_links_enrollment_id_idx" ON "tracked_links" ("enrollment_id");
CREATE INDEX "tracked_links_campaign_step_id_idx" ON "tracked_links" ("campaign_step_id");

CREATE INDEX "message_events_organization_id_event_type_idx" ON "message_events" ("organization_id", "event_type");
CREATE INDEX "message_events_enrollment_id_idx" ON "message_events" ("enrollment_id");
CREATE INDEX "message_events_message_outbox_id_idx" ON "message_events" ("message_outbox_id");
CREATE INDEX "message_events_tracked_link_id_idx" ON "message_events" ("tracked_link_id");

ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_campaign_step_id_fkey"
  FOREIGN KEY ("campaign_step_id") REFERENCES "campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox"
  ADD CONSTRAINT "message_outbox_person_channel_id_fkey"
  FOREIGN KEY ("person_channel_id") REFERENCES "person_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_campaign_step_id_fkey"
  FOREIGN KEY ("campaign_step_id") REFERENCES "campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links"
  ADD CONSTRAINT "tracked_links_message_outbox_id_fkey"
  FOREIGN KEY ("message_outbox_id") REFERENCES "message_outbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_message_outbox_id_fkey"
  FOREIGN KEY ("message_outbox_id") REFERENCES "message_outbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_tracked_link_id_fkey"
  FOREIGN KEY ("tracked_link_id") REFERENCES "tracked_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
