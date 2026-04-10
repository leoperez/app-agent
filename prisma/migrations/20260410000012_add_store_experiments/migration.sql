CREATE TABLE "StoreExperiment" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT,
    "field" TEXT NOT NULL,
    "variantA" TEXT,
    "variantB" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "winner" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreExperiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreExperiment_appId_idx" ON "StoreExperiment"("appId");
CREATE INDEX "StoreExperiment_appId_status_idx" ON "StoreExperiment"("appId", "status");

ALTER TABLE "StoreExperiment" ADD CONSTRAINT "StoreExperiment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
