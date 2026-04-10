-- Add requiresApproval flag to Team
ALTER TABLE "Team" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- Create PublishApproval table
CREATE TABLE "PublishApproval" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishApproval_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "PublishApproval_teamId_status_idx" ON "PublishApproval"("teamId", "status");
CREATE INDEX "PublishApproval_appId_idx" ON "PublishApproval"("appId");
