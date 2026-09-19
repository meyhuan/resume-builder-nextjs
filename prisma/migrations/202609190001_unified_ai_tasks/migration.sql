CREATE TABLE "AssistantTask" (
 "id" TEXT PRIMARY KEY, "owner" TEXT NOT NULL, "context" JSONB NOT NULL,
 "turns" JSONB NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AssistantTask_owner_updatedAt_idx" ON "AssistantTask"("owner", "updatedAt");
CREATE TABLE "AssistantRequest" (
 "id" TEXT PRIMARY KEY, "taskId" TEXT NOT NULL REFERENCES "AssistantTask"("id") ON DELETE CASCADE,
 "digest" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'running', "charged" BOOLEAN NOT NULL DEFAULT false,
 "feature" TEXT, "result" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AssistantRequest_taskId_idx" ON "AssistantRequest"("taskId");
