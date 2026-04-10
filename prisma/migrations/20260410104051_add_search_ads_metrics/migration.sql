-- CreateTable
CREATE TABLE "SearchAdsMetric" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchAdsMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAdsMetric_appId_date_idx" ON "SearchAdsMetric"("appId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SearchAdsMetric_appId_keyword_date_key" ON "SearchAdsMetric"("appId", "keyword", "date");

-- AddForeignKey
ALTER TABLE "SearchAdsMetric" ADD CONSTRAINT "SearchAdsMetric_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
