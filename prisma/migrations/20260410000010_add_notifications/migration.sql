CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "appId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_teamId_readAt_idx" ON "Notification"("teamId", "readAt");
CREATE INDEX "Notification_teamId_createdAt_idx" ON "Notification"("teamId", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
