-- Replace campaign UUIDs in the primary key and all campaign foreign keys.
-- Existing campaign URLs and webhook configurations must use the new IDs after migration.
BEGIN;

CREATE FUNCTION generate_campaign_id() RETURNS VARCHAR(6)
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  random_bytes BYTEA := decode(md5(gen_random_uuid()::TEXT), 'hex');
  code TEXT := '';
  position INTEGER;
BEGIN
  FOR position IN 0..5 LOOP
    code := code || substr(alphabet, (get_byte(random_bytes, position) % 36) + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

CREATE TEMP TABLE campaign_id_map (
  old_id UUID PRIMARY KEY,
  new_id VARCHAR(6) NOT NULL UNIQUE
) ON COMMIT DROP;

DO $$
DECLARE
  campaign_record RECORD;
  candidate VARCHAR(6);
BEGIN
  FOR campaign_record IN SELECT "id" FROM "campaigns" ORDER BY "created_at", "id" LOOP
    LOOP
      candidate := generate_campaign_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM campaign_id_map WHERE new_id = candidate);
    END LOOP;
    INSERT INTO campaign_id_map (old_id, new_id) VALUES (campaign_record."id", candidate);
  END LOOP;
END;
$$;

CREATE FUNCTION resolve_campaign_id(old_id UUID) RETURNS VARCHAR(6)
LANGUAGE SQL STABLE AS $$
  SELECT new_id FROM pg_temp.campaign_id_map WHERE campaign_id_map.old_id = $1
$$;

ALTER TABLE "campaign_steps" DROP CONSTRAINT "campaign_steps_campaign_id_fkey";
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_campaign_id_fkey";
ALTER TABLE "message_outbox" DROP CONSTRAINT "message_outbox_campaign_id_fkey";
ALTER TABLE "tracked_links" DROP CONSTRAINT "tracked_links_campaign_id_fkey";
ALTER TABLE "unsubscribe_tokens" DROP CONSTRAINT "unsubscribe_tokens_campaign_id_fkey";
ALTER TABLE "unsubscribe_events" DROP CONSTRAINT "unsubscribe_events_campaign_id_fkey";

ALTER TABLE "campaigns" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "campaign_steps" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "enrollments" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "message_outbox" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "tracked_links" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "unsubscribe_tokens" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "unsubscribe_events" ALTER COLUMN "campaign_id" TYPE VARCHAR(6) USING resolve_campaign_id("campaign_id");
ALTER TABLE "campaigns" ALTER COLUMN "id" TYPE VARCHAR(6) USING resolve_campaign_id("id");
ALTER TABLE "campaigns" ALTER COLUMN "id" SET DEFAULT generate_campaign_id();
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_id_format" CHECK ("id" ~ '^[0-9A-Z]{6}$');

ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_outbox" ADD CONSTRAINT "message_outbox_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unsubscribe_events" ADD CONSTRAINT "unsubscribe_events_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP FUNCTION resolve_campaign_id(UUID);

COMMIT;
