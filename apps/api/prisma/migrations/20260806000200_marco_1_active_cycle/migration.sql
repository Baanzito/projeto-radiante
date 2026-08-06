-- Enforce the single-active-cycle invariant even under concurrent requests.
CREATE UNIQUE INDEX "TrainingCycle_single_active_user_idx"
ON "TrainingCycle"("userId")
WHERE "status" = 'ACTIVE';
