-- Add notification preferences to User
ALTER TABLE "User" ADD COLUMN "notifyCompetitorChanges" BOOLEAN NOT NULL DEFAULT true;
