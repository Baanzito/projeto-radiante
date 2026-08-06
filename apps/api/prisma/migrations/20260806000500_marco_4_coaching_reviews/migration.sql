CREATE TYPE "CoachFeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "CoachFeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'VALIDATED', 'DISMISSED');
CREATE TYPE "WeeklyReviewStatus" AS ENUM ('GENERATED', 'REVIEWED', 'APPLIED');

CREATE TABLE "CoachSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "coachName" VARCHAR(120) NOT NULL DEFAULT 'Glym',
  "heldAt" TIMESTAMPTZ(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CoachSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachFeedback" (
  "id" UUID NOT NULL,
  "coachSessionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "focusAreaId" UUID,
  "category" "FocusCategory" NOT NULL,
  "priority" "CoachFeedbackPriority" NOT NULL,
  "feedbackText" TEXT NOT NULL,
  "evidence" TEXT,
  "suggestedAction" TEXT,
  "status" "CoachFeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CoachFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyReview" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "weeklyPlanId" UUID NOT NULL,
  "plannedMinutes" INTEGER NOT NULL,
  "completedMinutes" INTEGER NOT NULL,
  "consciousRankedCount" INTEGER NOT NULL,
  "wins" INTEGER NOT NULL,
  "losses" INTEGER NOT NULL,
  "rrDelta" INTEGER NOT NULL,
  "selfConclusion" TEXT,
  "repeatedPatterns" JSONB NOT NULL,
  "nextWeekProposal" JSONB,
  "status" "WeeklyReviewStatus" NOT NULL DEFAULT 'GENERATED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachSession_userId_heldAt_idx" ON "CoachSession"("userId", "heldAt");
CREATE INDEX "CoachFeedback_coachSessionId_priority_idx" ON "CoachFeedback"("coachSessionId", "priority");
CREATE INDEX "CoachFeedback_userId_status_idx" ON "CoachFeedback"("userId", "status");
CREATE INDEX "CoachFeedback_focusAreaId_idx" ON "CoachFeedback"("focusAreaId");
CREATE UNIQUE INDEX "WeeklyReview_weeklyPlanId_key" ON "WeeklyReview"("weeklyPlanId");
CREATE INDEX "WeeklyReview_userId_status_idx" ON "WeeklyReview"("userId", "status");
CREATE INDEX "WeeklyReview_userId_createdAt_idx" ON "WeeklyReview"("userId", "createdAt");

ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_duration_check" CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 720);
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_metrics_check" CHECK ("plannedMinutes" >= 0 AND "completedMinutes" >= 0 AND "consciousRankedCount" >= 0 AND "wins" >= 0 AND "losses" >= 0);

ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_coachSessionId_fkey" FOREIGN KEY ("coachSessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
