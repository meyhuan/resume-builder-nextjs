-- Additive production migration for the job workspace foundation.
-- Apply during a low-traffic window before deploying the application code.

ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "jobId" TEXT;

CREATE TABLE IF NOT EXISTS "ResumeFactSet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceResumeId" TEXT,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "facts" JSONB NOT NULL DEFAULT '[]',
  "confirmedFactIds" JSONB NOT NULL DEFAULT '[]',
  "sourceContentHash" TEXT NOT NULL,
  "sourceResumeUpdatedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResumeFactSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "company" TEXT,
  "role" TEXT NOT NULL,
  "jd" TEXT NOT NULL,
  "source" TEXT,
  "sourceUrl" TEXT,
  "location" TEXT,
  "salaryRange" TEXT,
  "identity" TEXT NOT NULL DEFAULT 'professional',
  "status" TEXT NOT NULL DEFAULT 'PREPARING',
  "baseResumeId" TEXT,
  "factSetId" TEXT NOT NULL,
  "matchSnapshot" JSONB,
  "suggestionSet" JSONB,
  "lastExportedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Resume_jobId_key" ON "Resume"("jobId");
CREATE INDEX IF NOT EXISTS "Resume_userId_jobId_idx" ON "Resume"("userId", "jobId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResumeFactSet_sourceResumeId_key" ON "ResumeFactSet"("sourceResumeId");
CREATE INDEX IF NOT EXISTS "ResumeFactSet_userId_updatedAt_idx" ON "ResumeFactSet"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Job_userId_status_updatedAt_idx" ON "Job"("userId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Job_baseResumeId_idx" ON "Job"("baseResumeId");
CREATE INDEX IF NOT EXISTS "Job_factSetId_idx" ON "Job"("factSetId");

DO $$ BEGIN
  ALTER TABLE "ResumeFactSet"
    ADD CONSTRAINT "ResumeFactSet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ResumeFactSet"
    ADD CONSTRAINT "ResumeFactSet_sourceResumeId_fkey"
    FOREIGN KEY ("sourceResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Job"
    ADD CONSTRAINT "Job_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Job"
    ADD CONSTRAINT "Job_baseResumeId_fkey"
    FOREIGN KEY ("baseResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Job"
    ADD CONSTRAINT "Job_factSetId_fkey"
    FOREIGN KEY ("factSetId") REFERENCES "ResumeFactSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Resume"
    ADD CONSTRAINT "Resume_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
