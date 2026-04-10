-- CreateTable
CREATE TABLE "AppReview" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "version" TEXT,
    "score" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppReview_appId_storeId_key" ON "AppReview"("appId", "storeId");

-- CreateIndex
CREATE INDEX "AppReview_appId_reviewedAt_idx" ON "AppReview"("appId", "reviewedAt");

-- CreateIndex
CREATE INDEX "AppReview_appId_score_idx" ON "AppReview"("appId", "score");

-- AddForeignKey
ALTER TABLE "AppReview" ADD CONSTRAINT "AppReview_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
