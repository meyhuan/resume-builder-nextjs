CREATE TYPE "JobApplicationStatus" AS ENUM ('DRAFT', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "ApplicationProfile" (
  "userId" TEXT NOT NULL,
  "defaultResumeId" TEXT,
  "encryptedPayload" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "lastResumeSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "JobApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resumeId" TEXT,
  "companyName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "location" TEXT,
  "jobUrl" TEXT,
  "applicationUrl" TEXT,
  "sourceDomain" TEXT,
  "status" "JobApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "appliedAt" TIMESTAMP(3),
  "note" TEXT,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplicationEvent" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "JobApplicationStatus",
  "toStatus" "JobApplicationStatus",
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobApplicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtensionAuthCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeChallenge" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtensionAuthCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtensionAuthorization" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "deviceName" TEXT,
  "scopes" TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExtensionAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobApplication_userId_fingerprint_key" ON "JobApplication"("userId", "fingerprint");
CREATE INDEX "JobApplication_userId_status_updatedAt_idx" ON "JobApplication"("userId", "status", "updatedAt");
CREATE INDEX "JobApplication_resumeId_idx" ON "JobApplication"("resumeId");
CREATE INDEX "JobApplicationEvent_applicationId_createdAt_idx" ON "JobApplicationEvent"("applicationId", "createdAt");
CREATE INDEX "ApplicationProfile_defaultResumeId_idx" ON "ApplicationProfile"("defaultResumeId");
CREATE UNIQUE INDEX "ExtensionAuthCode_codeHash_key" ON "ExtensionAuthCode"("codeHash");
CREATE INDEX "ExtensionAuthCode_userId_expiresAt_idx" ON "ExtensionAuthCode"("userId", "expiresAt");
CREATE UNIQUE INDEX "ExtensionAuthorization_tokenHash_key" ON "ExtensionAuthorization"("tokenHash");
CREATE INDEX "ExtensionAuthorization_userId_expiresAt_idx" ON "ExtensionAuthorization"("userId", "expiresAt");

ALTER TABLE "ApplicationProfile" ADD CONSTRAINT "ApplicationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationProfile" ADD CONSTRAINT "ApplicationProfile_defaultResumeId_fkey" FOREIGN KEY ("defaultResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobApplicationEvent" ADD CONSTRAINT "JobApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionAuthCode" ADD CONSTRAINT "ExtensionAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionAuthorization" ADD CONSTRAINT "ExtensionAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
