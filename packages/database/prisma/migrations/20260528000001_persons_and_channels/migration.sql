-- Phase 8 persons and channels foundation.
-- Adds tenant-owned recipient/contact records and reachable channels only.

CREATE TYPE "person_status" AS ENUM ('active', 'archived', 'deletion_requested');
CREATE TYPE "person_channel_type" AS ENUM ('sms', 'telegram', 'email');
CREATE TYPE "person_channel_verification_status" AS ENUM ('unverified', 'verified');

CREATE TABLE "persons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID,
  "display_name" TEXT NOT NULL,
  "timezone" TEXT,
  "status" "person_status" NOT NULL DEFAULT 'active',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "deletion_requested_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "person_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "channel_type" "person_channel_type" NOT NULL,
  "address" TEXT NOT NULL,
  "verification_status" "person_channel_verification_status" NOT NULL DEFAULT 'unverified',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
  "suppressed" BOOLEAN NOT NULL DEFAULT false,
  "provider_metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "person_channels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "persons_organization_id_status_idx" ON "persons"("organization_id", "status");
CREATE INDEX "persons_organization_id_display_name_idx" ON "persons"("organization_id", "display_name");
CREATE INDEX "persons_user_id_idx" ON "persons"("user_id");

CREATE UNIQUE INDEX "person_channels_organization_id_channel_type_address_key"
  ON "person_channels"("organization_id", "channel_type", "address");
CREATE INDEX "person_channels_organization_id_channel_type_idx"
  ON "person_channels"("organization_id", "channel_type");
CREATE INDEX "person_channels_person_id_idx" ON "person_channels"("person_id");

ALTER TABLE "persons"
  ADD CONSTRAINT "persons_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "persons"
  ADD CONSTRAINT "persons_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "person_channels"
  ADD CONSTRAINT "person_channels_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "person_channels"
  ADD CONSTRAINT "person_channels_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

