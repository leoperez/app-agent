-- CreateTable
CREATE TABLE "ScheduledPublish" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPublish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPublish_appId_idx" ON "ScheduledPublish"("appId");

-- CreateIndex
CREATE INDEX "ScheduledPublish_status_scheduledAt_idx" ON "ScheduledPublish"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ScheduledPublish" ADD CONSTRAINT "ScheduledPublish_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
