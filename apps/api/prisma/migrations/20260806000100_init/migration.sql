-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FocusCategory" AS ENUM ('DECISION', 'COMMUNICATION', 'AWARENESS', 'MOVEMENT', 'AIM', 'POSITIONING', 'MENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TrainingCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FocusPriority" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "CycleConclusion" AS ENUM ('IMPROVED', 'UNCHANGED', 'REGRESSED', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "userId" UUID NOT NULL,
    "currentRank" VARCHAR(50) NOT NULL,
    "currentRr" INTEGER,
    "peakRank" VARCHAR(50),
    "valorantName" VARCHAR(64),
    "valorantTag" VARCHAR(16),
    "sensitivity" DECIMAL(6,3) NOT NULL,
    "dpi" INTEGER NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "weeklyRankedMin" INTEGER NOT NULL DEFAULT 10,
    "weeklyRankedMax" INTEGER NOT NULL DEFAULT 14,
    "defaultSessionStart" TIME(0),
    "defaultSessionEnd" TIME(0),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FocusArea" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "FocusCategory" NOT NULL,
    "observableBehavior" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FocusArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCycle" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "TrainingCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "conclusion" "CycleConclusion",
    "conclusionNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TrainingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleFocus" (
    "cycleId" UUID NOT NULL,
    "focusAreaId" UUID NOT NULL,
    "priority" "FocusPriority" NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleFocus_pkey" PRIMARY KEY ("cycleId","focusAreaId")
);

-- CreateIndex
CREATE INDEX "FocusArea_userId_active_idx" ON "FocusArea"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FocusArea_userId_name_key" ON "FocusArea"("userId", "name");

-- CreateIndex
CREATE INDEX "TrainingCycle_userId_status_idx" ON "TrainingCycle"("userId", "status");

-- CreateIndex
CREATE INDEX "TrainingCycle_userId_startDate_endDate_idx" ON "TrainingCycle"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CycleFocus_cycleId_priority_idx" ON "CycleFocus"("cycleId", "priority");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusArea" ADD CONSTRAINT "FocusArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCycle" ADD CONSTRAINT "TrainingCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleFocus" ADD CONSTRAINT "CycleFocus_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleFocus" ADD CONSTRAINT "CycleFocus_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
