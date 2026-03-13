-- Add extension capture fields to Application table

-- Create ApplicationSource enum
CREATE TYPE "ApplicationSource" AS ENUM ('web', 'extension', 'import');

-- Add new columns to Application table
ALTER TABLE "Application" 
    ADD COLUMN "source" "ApplicationSource" DEFAULT 'web' NOT NULL,
    ADD COLUMN "externalJobId" TEXT,
    ADD COLUMN "captureMetadata" JSONB,
    ADD COLUMN "fingerprint" TEXT;

-- Create indexes for the new fields
CREATE INDEX "Application_fingerprint_idx" ON "Application"("fingerprint");
CREATE INDEX "Application_source_idx" ON "Application"("source");

-- Create composite index for user + fingerprint lookups (common query pattern)
CREATE INDEX "Application_userId_fingerprint_idx" ON "Application"("userId", "fingerprint");
