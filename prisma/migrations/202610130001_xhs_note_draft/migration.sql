-- Daily cap ledger for Xiaohongshu note drafts. Production should apply this with
-- `prisma migrate deploy` when that is the release path; `db push` also creates it.
CREATE TABLE "XhsNoteDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XhsNoteDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "XhsNoteDraft_userId_createdAt_idx" ON "XhsNoteDraft"("userId", "createdAt");

ALTER TABLE "XhsNoteDraft" ADD CONSTRAINT "XhsNoteDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
