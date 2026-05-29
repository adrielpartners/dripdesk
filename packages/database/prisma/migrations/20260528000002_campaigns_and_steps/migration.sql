-- Phase 9 campaigns and linear campaign steps.
-- Adds campaign setup/editing only; no enrollment, scheduling jobs, or delivery state.

CREATE TYPE "campaign_status" AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE "campaign_schedule_type" AS ENUM (
  'daily',
  'weekdays',
  'monday_wednesday_friday',
  'custom_interval',
  'custom_days_of_week'
);
CREATE TYPE "campaign_progress_rule" AS ENUM ('time_based', 'link_click_required', 'reply_required');
CREATE TYPE "campaign_mode" AS ENUM ('standard', 'advanced');
CREATE TYPE "campaign_step_status" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "campaign_status" NOT NULL DEFAULT 'draft',
  "schedule_type" "campaign_schedule_type" NOT NULL DEFAULT 'daily',
  "schedule_config" JSONB,
  "progress_rule" "campaign_progress_rule" NOT NULL DEFAULT 'time_based',
  "mode" "campaign_mode" NOT NULL DEFAULT 'standard',
  "default_channels" "person_channel_type"[] NOT NULL DEFAULT ARRAY['email']::"person_channel_type"[],
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "activated_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),

  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "step_order" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" "campaign_step_status" NOT NULL DEFAULT 'draft',
  "default_content" TEXT,
  "sms_content" TEXT,
  "telegram_content" TEXT,
  "email_subject" TEXT,
  "email_body" TEXT,
  "delay_days_override" INTEGER,
  "channel_overrides" "person_channel_type"[] NOT NULL DEFAULT ARRAY[]::"person_channel_type"[],
  "reply_required_phrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),

  CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaigns_organization_id_status_idx" ON "campaigns"("organization_id", "status");
CREATE INDEX "campaigns_organization_id_created_at_idx" ON "campaigns"("organization_id", "created_at");

CREATE UNIQUE INDEX "campaign_steps_campaign_id_step_order_key"
  ON "campaign_steps"("campaign_id", "step_order");
CREATE INDEX "campaign_steps_campaign_id_status_idx" ON "campaign_steps"("campaign_id", "status");

ALTER TABLE "campaigns"
  ADD CONSTRAINT "campaigns_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaigns"
  ADD CONSTRAINT "campaigns_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campaign_steps"
  ADD CONSTRAINT "campaign_steps_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

