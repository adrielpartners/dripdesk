CREATE TYPE "provider_credential_type" AS ENUM ('twilio', 'telegram', 'smtp');

CREATE TYPE "provider_credential_status" AS ENUM ('configured', 'verified', 'failed');

CREATE TABLE "provider_credentials" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "provider_type" "provider_credential_type" NOT NULL,
  "encrypted_config" text NOT NULL,
  "masked_config" jsonb NOT NULL,
  "status" "provider_credential_status" NOT NULL DEFAULT 'configured',
  "last_tested_at" timestamptz(6),
  "last_error" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,

  CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_credentials_organization_id_provider_type_key"
  ON "provider_credentials" ("organization_id", "provider_type");
CREATE INDEX "provider_credentials_organization_id_idx" ON "provider_credentials" ("organization_id");

ALTER TABLE "provider_credentials"
  ADD CONSTRAINT "provider_credentials_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
