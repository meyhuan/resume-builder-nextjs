-- Additive migration for application tracking and immutable activity history.

CREATE TABLE IF NOT EXISTS "Application" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL,
  "resumeId" TEXT,
  "materialIds" JSONB NOT NULL DEFAULT '[]',
  "contactName" TEXT,
  "contactInfo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "nextActionAt" TIMESTAMP(3),
  "note" TEXT,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobActivity" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "applicationId" TEXT,
  "type" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Application_jobId_updatedAt_idx" ON "Application"("jobId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Application_status_nextActionAt_idx" ON "Application"("status", "nextActionAt");
CREATE INDEX IF NOT EXISTS "Application_resumeId_idx" ON "Application"("resumeId");
CREATE INDEX IF NOT EXISTS "JobActivity_jobId_occurredAt_idx" ON "JobActivity"("jobId", "occurredAt");
CREATE INDEX IF NOT EXISTS "JobActivity_applicationId_occurredAt_idx" ON "JobActivity"("applicationId", "occurredAt");

DO $$ BEGIN
  ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
