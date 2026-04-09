-- CreateTable
CREATE TABLE "AppAnalytics" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER,
    "pageViews" INTEGER,
    "downloads" INTEGER,
    "sessions" INTEGER,
    "activeDevices" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppAnalytics_appId_date_key" ON "AppAnalytics"("appId", "date");

-- CreateIndex
CREATE INDEX "AppAnalytics_appId_date_idx" ON "AppAnalytics"("appId", "date");

-- AddForeignKey
ALTER TABLE "AppAnalytics" ADD CONSTRAINT "AppAnalytics_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
