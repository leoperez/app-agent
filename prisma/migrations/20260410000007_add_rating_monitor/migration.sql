-- CreateTable
CREATE TABLE "AppRatingSnapshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "ratingCount" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRatingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRatingSnapshot_appId_recordedAt_key" ON "AppRatingSnapshot"("appId", "recordedAt");
CREATE INDEX "AppRatingSnapshot_appId_recordedAt_idx" ON "AppRatingSnapshot"("appId", "recordedAt");

-- AddForeignKey
ALTER TABLE "AppRatingSnapshot" ADD CONSTRAINT "AppRatingSnapshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ratingAlertThreshold" DOUBLE PRECISION;
