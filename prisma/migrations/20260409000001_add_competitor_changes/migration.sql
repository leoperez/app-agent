-- CreateTable
CREATE TABLE "CompetitorChange" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorChange_competitorId_idx" ON "CompetitorChange"("competitorId");

-- CreateIndex
CREATE INDEX "CompetitorChange_detectedAt_idx" ON "CompetitorChange"("detectedAt");

-- AddForeignKey
ALTER TABLE "CompetitorChange" ADD CONSTRAINT "CompetitorChange_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
