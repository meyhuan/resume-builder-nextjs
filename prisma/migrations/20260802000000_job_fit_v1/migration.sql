CREATE TYPE "ResumeKind" AS ENUM ('BASE', 'JOB_FIT');
CREATE TYPE "JobFitSourceType" AS ENUM ('EXISTING', 'FILE', 'TEXT');
CREATE TYPE "JobFitStatus" AS ENUM ('DRAFT', 'PARSING_SOURCE', 'READY', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "JobFitStage" AS ENUM ('PREPARE', 'ANALYZE', 'OPTIMIZE', 'EXPLAIN');
CREATE TYPE "JobFitQuotaState" AS ENUM ('NONE', 'RESERVED', 'COMMITTED', 'RELEASED');

ALTER TABLE "Resume" ADD COLUMN "kind" "ResumeKind" NOT NULL DEFAULT 'BASE';
ALTER TABLE "Resume" ADD COLUMN "sourceResumeId" TEXT;
CREATE INDEX "Resume_userId_kind_updatedAt_idx" ON "Resume"("userId", "kind", "updatedAt");
CREATE INDEX "Resume_sourceResumeId_idx" ON "Resume"("sourceResumeId");
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_sourceResumeId_fkey" FOREIGN KEY ("sourceResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "JobFitTask" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "sourceType" "JobFitSourceType" NOT NULL,
  "sourceResumeId" TEXT, "tailoredResumeId" TEXT, "idempotencyKey" TEXT NOT NULL,
  "retryOfTaskId" TEXT, "billingRootTaskId" TEXT, "companyName" TEXT, "jobTitle" TEXT,
  "jobDescription" TEXT, "jobUrl" TEXT, "focusAreas" JSONB NOT NULL DEFAULT '[]',
  "sourceSnapshot" JSONB, "sourceHash" TEXT, "optimizedSnapshot" JSONB, "scoring" JSONB,
  "summary" JSONB, "changes" JSONB, "status" "JobFitStatus" NOT NULL DEFAULT 'DRAFT',
  "stage" "JobFitStage" NOT NULL DEFAULT 'PREPARE', "progress" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT, "errorMessage" TEXT, "retryable" BOOLEAN NOT NULL DEFAULT false,
  "quotaState" "JobFitQuotaState" NOT NULL DEFAULT 'NONE', "quotaDate" TEXT,
  "leaseToken" TEXT, "leaseExpiresAt" TIMESTAMP(3), "cancelRequestedAt" TIMESTAMP(3),
  "promptVersion" TEXT NOT NULL DEFAULT 'job-fit-prompt-v1', "scoringVersion" TEXT NOT NULL DEFAULT 'job-fit-score-v1',
  "modelName" TEXT, "factGuardRejectCount" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobFitTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobFitTask_tailoredResumeId_key" ON "JobFitTask"("tailoredResumeId");
CREATE UNIQUE INDEX "JobFitTask_userId_idempotencyKey_key" ON "JobFitTask"("userId", "idempotencyKey");
CREATE INDEX "JobFitTask_userId_createdAt_idx" ON "JobFitTask"("userId", "createdAt");
CREATE INDEX "JobFitTask_userId_status_idx" ON "JobFitTask"("userId", "status");
CREATE INDEX "JobFitTask_status_leaseExpiresAt_idx" ON "JobFitTask"("status", "leaseExpiresAt");
CREATE INDEX "JobFitTask_sourceResumeId_idx" ON "JobFitTask"("sourceResumeId");
CREATE INDEX "JobFitTask_billingRootTaskId_idx" ON "JobFitTask"("billingRootTaskId");
ALTER TABLE "JobFitTask" ADD CONSTRAINT "JobFitTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobFitTask" ADD CONSTRAINT "JobFitTask_sourceResumeId_fkey" FOREIGN KEY ("sourceResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobFitTask" ADD CONSTRAINT "JobFitTask_tailoredResumeId_fkey" FOREIGN KEY ("tailoredResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobFitTask" ADD CONSTRAINT "JobFitTask_retryOfTaskId_fkey" FOREIGN KEY ("retryOfTaskId") REFERENCES "JobFitTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
