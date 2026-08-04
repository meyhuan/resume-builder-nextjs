CREATE TYPE "JobFitOptimizationMode" AS ENUM ('PROFESSIONAL', 'SPRINT');

ALTER TABLE "JobFitTask"
ADD COLUMN "optimizationMode" "JobFitOptimizationMode" NOT NULL DEFAULT 'PROFESSIONAL',
ADD COLUMN "claims" JSONB,
ADD COLUMN "readiness" TEXT,
ADD COLUMN "resultSchemaVersion" TEXT,
ADD COLUMN "engineVersion" TEXT;
