-- CreateTable
CREATE TABLE "ScreenshotSetAbTest" (
    "id" TEXT NOT NULL,
    "setAId" TEXT NOT NULL,
    "setBId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenshotSetAbTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenshotSetAbTest_setAId_setBId_key" ON "ScreenshotSetAbTest"("setAId", "setBId");

-- CreateIndex
CREATE INDEX "ScreenshotSetAbTest_setAId_idx" ON "ScreenshotSetAbTest"("setAId");

-- CreateIndex
CREATE INDEX "ScreenshotSetAbTest_setBId_idx" ON "ScreenshotSetAbTest"("setBId");

-- AddForeignKey
ALTER TABLE "ScreenshotSetAbTest" ADD CONSTRAINT "ScreenshotSetAbTest_setAId_fkey" FOREIGN KEY ("setAId") REFERENCES "ScreenshotSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotSetAbTest" ADD CONSTRAINT "ScreenshotSetAbTest_setBId_fkey" FOREIGN KEY ("setBId") REFERENCES "ScreenshotSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
