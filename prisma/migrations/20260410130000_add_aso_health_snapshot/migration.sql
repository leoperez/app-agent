CREATE TABLE "AsoHealthSnapshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsoHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AsoHealthSnapshot_appId_recordedAt_key" ON "AsoHealthSnapshot"("appId", "recordedAt");
CREATE INDEX "AsoHealthSnapshot_appId_recordedAt_idx" ON "AsoHealthSnapshot"("appId", "recordedAt");

ALTER TABLE "AsoHealthSnapshot" ADD CONSTRAINT "AsoHealthSnapshot_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
