CREATE TABLE "ExtensionTelemetryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "properties" JSONB NOT NULL,
    CONSTRAINT "ExtensionTelemetryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExtensionTelemetryEvent_eventName_occurredAt_idx" ON "ExtensionTelemetryEvent"("eventName", "occurredAt");
CREATE INDEX "ExtensionTelemetryEvent_userId_receivedAt_idx" ON "ExtensionTelemetryEvent"("userId", "receivedAt");
ALTER TABLE "ExtensionTelemetryEvent" ADD CONSTRAINT "ExtensionTelemetryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
