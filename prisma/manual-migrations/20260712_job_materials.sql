-- Additive migration for job-scoped, editable application materials.

CREATE TABLE IF NOT EXISTS "JobMaterial" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "sourceFactIds" JSONB NOT NULL DEFAULT '[]',
  "generationMeta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobMaterial_jobId_type_key" ON "JobMaterial"("jobId", "type");
CREATE INDEX IF NOT EXISTS "JobMaterial_jobId_updatedAt_idx" ON "JobMaterial"("jobId", "updatedAt");

DO $$ BEGIN
  ALTER TABLE "JobMaterial"
    ADD CONSTRAINT "JobMaterial_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
