-- Additive migration for interview rounds and application outcomes.

CREATE TABLE IF NOT EXISTS "Interview" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "round" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "interviewer" TEXT,
  "questions" JSONB NOT NULL DEFAULT '[]',
  "answers" JSONB NOT NULL DEFAULT '[]',
  "review" TEXT,
  "nextActions" JSONB NOT NULL DEFAULT '[]',
  "result" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Outcome" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "replyReceived" BOOLEAN NOT NULL DEFAULT false,
  "interviewReached" INTEGER NOT NULL DEFAULT 0,
  "offerReceived" BOOLEAN NOT NULL DEFAULT false,
  "reasonCodes" JSONB NOT NULL DEFAULT '[]',
  "note" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Interview_jobId_scheduledAt_idx" ON "Interview"("jobId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Interview_applicationId_scheduledAt_idx" ON "Interview"("applicationId", "scheduledAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Outcome_applicationId_key" ON "Outcome"("applicationId");
CREATE INDEX IF NOT EXISTS "Outcome_jobId_submittedAt_idx" ON "Outcome"("jobId", "submittedAt");

DO $$ BEGIN
  ALTER TABLE "Interview" ADD CONSTRAINT "Interview_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
