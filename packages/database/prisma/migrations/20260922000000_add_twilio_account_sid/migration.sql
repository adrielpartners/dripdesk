ALTER TABLE "provider_credentials"
  ADD COLUMN "twilio_account_sid" text;

CREATE INDEX "provider_credentials_twilio_account_sid_idx"
  ON "provider_credentials" ("twilio_account_sid");
