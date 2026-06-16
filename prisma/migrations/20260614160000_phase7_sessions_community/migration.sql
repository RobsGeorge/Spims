-- Phase 7: session reminder tracking
ALTER TABLE "LiveSession" ADD COLUMN "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN "reminder15mSentAt" TIMESTAMP(3);
