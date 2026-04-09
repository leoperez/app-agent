-- CreateTable
CREATE TABLE "AsoKeywordRanking" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "platform" "Platform" NOT NULL,
    "locale" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "position" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsoKeywordRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsoKeywordRanking_appId_locale_keyword_recordedAt_idx" ON "AsoKeywordRanking"("appId", "locale", "keyword", "recordedAt");

-- CreateIndex
CREATE INDEX "AsoKeywordRanking_appId_idx" ON "AsoKeywordRanking"("appId");

-- CreateIndex
CREATE INDEX "AsoKeywordRanking_recordedAt_idx" ON "AsoKeywordRanking"("recordedAt");

-- AddForeignKey
ALTER TABLE "AsoKeywordRanking" ADD CONSTRAINT "AsoKeywordRanking_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
