ALTER TABLE "JobApplication"
ADD COLUMN "deadlineAt" TIMESTAMP(3),
ADD COLUMN "nextActionAt" TIMESTAMP(3),
ADD COLUMN "nextActionType" TEXT;

CREATE INDEX "JobApplication_userId_nextActionAt_idx"
ON "JobApplication"("userId", "nextActionAt");
