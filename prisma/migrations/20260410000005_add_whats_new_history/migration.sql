-- CreateTable
CREATE TABLE "WhatsNewHistory" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "version" TEXT,
    "pushedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsNewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsNewHistory_appId_locale_pushedAt_idx" ON "WhatsNewHistory"("appId", "locale", "pushedAt");

-- AddForeignKey
ALTER TABLE "WhatsNewHistory" ADD CONSTRAINT "WhatsNewHistory_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
