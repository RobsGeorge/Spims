-- Phase 6: assessment engine + gradebook fields
ALTER TABLE "Assignment" ADD COLUMN "itemWeight" DOUBLE PRECISION,
ADD COLUMN "released" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Assessment" ADD COLUMN "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN "itemWeight" DOUBLE PRECISION,
ADD COLUMN "released" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AssessmentAttempt" ADD COLUMN "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "examSnapshot" JSONB;

CREATE INDEX "AssessmentAttempt_status_dueAt_idx" ON "AssessmentAttempt"("status", "dueAt");
