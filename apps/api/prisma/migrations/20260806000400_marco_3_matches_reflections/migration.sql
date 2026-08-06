CREATE TYPE "MatchSource" AS ENUM ('MANUAL', 'RIOT', 'IMPORT');
CREATE TYPE "MatchQueueType" AS ENUM ('COMPETITIVE', 'UNRATED', 'PREMIER', 'SWIFTPLAY', 'SPIKE_RUSH', 'DEATHMATCH', 'TEAM_DEATHMATCH', 'CUSTOM', 'OTHER');
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'REMAKE', 'UNKNOWN');

CREATE TABLE "Match" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "sessionId" UUID,
  "source" "MatchSource" NOT NULL DEFAULT 'MANUAL',
  "riotMatchId" VARCHAR(120),
  "startedAt" TIMESTAMPTZ(3) NOT NULL,
  "queueType" "MatchQueueType" NOT NULL,
  "agentName" VARCHAR(80) NOT NULL,
  "mapName" VARCHAR(80) NOT NULL,
  "result" "MatchResult" NOT NULL,
  "allyScore" INTEGER NOT NULL,
  "enemyScore" INTEGER NOT NULL,
  "rrChange" INTEGER,
  "kills" INTEGER,
  "deaths" INTEGER,
  "assists" INTEGER,
  "acs" INTEGER,
  "headshotPct" DECIMAL(5,2),
  "firstKills" INTEGER,
  "firstDeaths" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchReflection" (
  "id" UUID NOT NULL,
  "matchId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "decisionClarity" INTEGER NOT NULL,
  "callResponse" INTEGER NOT NULL,
  "patternReading" INTEGER NOT NULL,
  "freezesCount" INTEGER NOT NULL DEFAULT 0,
  "taskConflictsCount" INTEGER NOT NULL DEFAULT 0,
  "delayedCallsCount" INTEGER NOT NULL DEFAULT 0,
  "communicatedIntentionsCount" INTEGER NOT NULL DEFAULT 0,
  "movementErrorsCount" INTEGER NOT NULL DEFAULT 0,
  "ecoPositioningErrorsCount" INTEGER NOT NULL DEFAULT 0,
  "unnecessaryCrosshairMovesCount" INTEGER NOT NULL DEFAULT 0,
  "patternsRecognizedCount" INTEGER NOT NULL DEFAULT 0,
  "adaptationsAppliedCount" INTEGER NOT NULL DEFAULT 0,
  "goodDecision" TEXT,
  "nextCorrection" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MatchReflection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_userId_startedAt_idx" ON "Match"("userId", "startedAt");
CREATE INDEX "Match_sessionId_startedAt_idx" ON "Match"("sessionId", "startedAt");
CREATE UNIQUE INDEX "Match_riotMatchId_key" ON "Match"("userId", "riotMatchId") WHERE "riotMatchId" IS NOT NULL;
CREATE UNIQUE INDEX "MatchReflection_matchId_key" ON "MatchReflection"("matchId");
CREATE INDEX "MatchReflection_userId_createdAt_idx" ON "MatchReflection"("userId", "createdAt");

ALTER TABLE "Match" ADD CONSTRAINT "Match_scores_check" CHECK ("allyScore" >= 0 AND "enemyScore" >= 0);
ALTER TABLE "Match" ADD CONSTRAINT "Match_stats_check" CHECK (("kills" IS NULL OR "kills" >= 0) AND ("deaths" IS NULL OR "deaths" >= 0) AND ("assists" IS NULL OR "assists" >= 0) AND ("acs" IS NULL OR "acs" >= 0) AND ("headshotPct" IS NULL OR "headshotPct" BETWEEN 0 AND 100) AND ("firstKills" IS NULL OR "firstKills" >= 0) AND ("firstDeaths" IS NULL OR "firstDeaths" >= 0));
ALTER TABLE "MatchReflection" ADD CONSTRAINT "MatchReflection_ratings_check" CHECK ("decisionClarity" BETWEEN 1 AND 5 AND "callResponse" BETWEEN 1 AND 5 AND "patternReading" BETWEEN 1 AND 5);
ALTER TABLE "MatchReflection" ADD CONSTRAINT "MatchReflection_counts_check" CHECK ("freezesCount" >= 0 AND "taskConflictsCount" >= 0 AND "delayedCallsCount" >= 0 AND "communicatedIntentionsCount" >= 0 AND "movementErrorsCount" >= 0 AND "ecoPositioningErrorsCount" >= 0 AND "unnecessaryCrosshairMovesCount" >= 0 AND "patternsRecognizedCount" >= 0 AND "adaptationsAppliedCount" >= 0);

ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchReflection" ADD CONSTRAINT "MatchReflection_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchReflection" ADD CONSTRAINT "MatchReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
