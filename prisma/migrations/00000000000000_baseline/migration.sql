-- Baseline for databases that predate tracked Prisma migrations.
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "clerkId" TEXT, "wxId" TEXT, "javaUserId" TEXT, "email" TEXT,
  "name" TEXT, "avatar" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX "User_wxId_key" ON "User"("wxId");
CREATE UNIQUE INDEX "User_javaUserId_key" ON "User"("javaUserId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Resume" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "content" JSONB NOT NULL,
  "template" TEXT NOT NULL DEFAULT 'simple', "thumbnail" TEXT, "meta" JSONB,
  "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ExportRecord" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "wxId" TEXT NOT NULL, "resumeId" TEXT NOT NULL,
  "resumeTitle" TEXT NOT NULL, "templateId" TEXT, "type" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "token" TEXT NOT NULL, "ossKey" TEXT, "ossUrl" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available', "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExportRecord_token_key" ON "ExportRecord"("token");
CREATE INDEX "ExportRecord_wxId_createdAt_idx" ON "ExportRecord"("wxId", "createdAt");
CREATE INDEX "ExportRecord_userId_createdAt_idx" ON "ExportRecord"("userId", "createdAt");
ALTER TABLE "ExportRecord" ADD CONSTRAINT "ExportRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResumeMigration" (
  "userId" TEXT NOT NULL, "sourceCount" INTEGER NOT NULL DEFAULT 0, "migratedCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL, "failedItems" JSONB, "startedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResumeMigration_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "ResumeMigration" ADD CONSTRAINT "ResumeMigration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL, "content" TEXT NOT NULL, "contact" TEXT, "attachment" TEXT, "diagnostics" JSONB,
  "requestLogs" JSONB, "status" TEXT NOT NULL DEFAULT 'RECEIVED', "adminReply" TEXT, "adminReplyAt" TIMESTAMP(3),
  "likeCount" INTEGER NOT NULL DEFAULT 0, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserQuota" (
  "userId" TEXT NOT NULL, "quotas" JSONB NOT NULL DEFAULT '{}', "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
