-- Add autoRepliedAt to AppReview
ALTER TABLE "AppReview" ADD COLUMN "autoRepliedAt" TIMESTAMP(3);

-- Create ReviewAutoReplyRule table
CREATE TABLE "ReviewAutoReplyRule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "appId" TEXT,
    "minRating" INTEGER NOT NULL,
    "maxRating" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAutoReplyRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewAutoReplyRule_teamId_idx" ON "ReviewAutoReplyRule"("teamId");

ALTER TABLE "ReviewAutoReplyRule"
    ADD CONSTRAINT "ReviewAutoReplyRule_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewAutoReplyRule"
    ADD CONSTRAINT "ReviewAutoReplyRule_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewAutoReplyRule"
    ADD CONSTRAINT "ReviewAutoReplyRule_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ReviewTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
