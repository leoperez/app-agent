-- CreateTable
CREATE TABLE "ScreenshotSetShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenshotSetShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenshotSetShareToken_token_key" ON "ScreenshotSetShareToken"("token");

-- CreateIndex
CREATE INDEX "ScreenshotSetShareToken_setId_idx" ON "ScreenshotSetShareToken"("setId");

-- CreateIndex
CREATE INDEX "ScreenshotSetShareToken_token_idx" ON "ScreenshotSetShareToken"("token");

-- AddForeignKey
ALTER TABLE "ScreenshotSetShareToken" ADD CONSTRAINT "ScreenshotSetShareToken_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ScreenshotSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
