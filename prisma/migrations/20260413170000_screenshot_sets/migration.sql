-- CreateTable
CREATE TABLE "ScreenshotSet" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled set',
    "layoutId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "customBg" TEXT,
    "customText" TEXT,
    "customAccent" TEXT,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenshotSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenshotSet_appId_idx" ON "ScreenshotSet"("appId");
CREATE INDEX "ScreenshotSet_appId_locale_idx" ON "ScreenshotSet"("appId", "locale");

-- AddForeignKey
ALTER TABLE "ScreenshotSet" ADD CONSTRAINT "ScreenshotSet_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
