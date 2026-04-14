-- CreateTable
CREATE TABLE "ScreenshotSetSnapshot" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "layoutId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "fontId" TEXT NOT NULL DEFAULT 'system',
    "decorationId" TEXT NOT NULL DEFAULT 'none',
    "customBg" TEXT,
    "customText" TEXT,
    "customAccent" TEXT,
    "bgGradient" JSONB,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenshotSetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenshotSetSnapshot_setId_idx" ON "ScreenshotSetSnapshot"("setId");

-- AddForeignKey
ALTER TABLE "ScreenshotSetSnapshot" ADD CONSTRAINT "ScreenshotSetSnapshot_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ScreenshotSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
