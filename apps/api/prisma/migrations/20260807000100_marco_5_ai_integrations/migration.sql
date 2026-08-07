CREATE TYPE "AiRecommendationType" AS ENUM ('SESSION_SUMMARY', 'WEEKLY_SUMMARY', 'WEEKLY_PLAN_PROPOSAL');
CREATE TYPE "AiRecommendationStatus" AS ENUM ('GENERATED', 'CONFIRMED', 'APPLIED', 'REJECTED', 'FAILED');
CREATE TYPE "AuditActor" AS ENUM ('USER', 'AI', 'MCP', 'SYSTEM');
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_CALENDAR');
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');
CREATE TYPE "CalendarSyncStatus" AS ENUM ('SYNCED', 'CANCELLED', 'ERROR');

CREATE TABLE "AiRecommendation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "AiRecommendationType" NOT NULL,
  "status" "AiRecommendationStatus" NOT NULL DEFAULT 'GENERATED',
  "sourceType" VARCHAR(80) NOT NULL,
  "sourceId" UUID,
  "model" VARCHAR(120) NOT NULL,
  "promptVersion" VARCHAR(40) NOT NULL,
  "structuredOutput" JSONB NOT NULL,
  "proposedMutation" JSONB,
  "failureReason" TEXT,
  "decidedAt" TIMESTAMPTZ(3),
  "appliedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "actor" "AuditActor" NOT NULL,
  "action" VARCHAR(120) NOT NULL,
  "entityType" VARCHAR(80) NOT NULL,
  "entityId" UUID,
  "summary" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationAccount" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
  "scopes" TEXT[],
  "encryptedCredentials" TEXT NOT NULL,
  "accountLabel" VARCHAR(160),
  "accessTokenExpiresAt" TIMESTAMPTZ(3),
  "providerMetadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationOAuthState" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "stateHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEventSync" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "integrationAccountId" UUID NOT NULL,
  "routineBlockId" UUID NOT NULL,
  "calendarId" VARCHAR(255) NOT NULL DEFAULT 'primary',
  "externalEventId" VARCHAR(1024) NOT NULL,
  "status" "CalendarSyncStatus" NOT NULL DEFAULT 'SYNCED',
  "payloadHash" CHAR(64) NOT NULL,
  "htmlLink" TEXT,
  "lastError" TEXT,
  "lastSyncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CalendarEventSync_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiRecommendation_userId_createdAt_idx" ON "AiRecommendation"("userId", "createdAt");
CREATE INDEX "AiRecommendation_userId_status_idx" ON "AiRecommendation"("userId", "status");
CREATE INDEX "AiRecommendation_sourceType_sourceId_idx" ON "AiRecommendation"("sourceType", "sourceId");
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");
CREATE INDEX "AuditEvent_actor_action_idx" ON "AuditEvent"("actor", "action");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE UNIQUE INDEX "IntegrationAccount_userId_provider_key" ON "IntegrationAccount"("userId", "provider");
CREATE INDEX "IntegrationAccount_userId_status_idx" ON "IntegrationAccount"("userId", "status");
CREATE UNIQUE INDEX "IntegrationOAuthState_stateHash_key" ON "IntegrationOAuthState"("stateHash");
CREATE INDEX "IntegrationOAuthState_userId_provider_expiresAt_idx" ON "IntegrationOAuthState"("userId", "provider", "expiresAt");
CREATE UNIQUE INDEX "CalendarEventSync_routineBlockId_key" ON "CalendarEventSync"("routineBlockId");
CREATE UNIQUE INDEX "CalendarEventSync_integrationAccountId_externalEventId_key" ON "CalendarEventSync"("integrationAccountId", "externalEventId");
CREATE INDEX "CalendarEventSync_userId_status_idx" ON "CalendarEventSync"("userId", "status");

ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationOAuthState" ADD CONSTRAINT "IntegrationOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventSync" ADD CONSTRAINT "CalendarEventSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventSync" ADD CONSTRAINT "CalendarEventSync_integrationAccountId_fkey" FOREIGN KEY ("integrationAccountId") REFERENCES "IntegrationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventSync" ADD CONSTRAINT "CalendarEventSync_routineBlockId_fkey" FOREIGN KEY ("routineBlockId") REFERENCES "RoutineBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
