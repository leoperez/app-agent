CREATE TABLE "ScreenshotTemplate" (
  "id"           TEXT NOT NULL,
  "teamId"       TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "layoutId"     TEXT NOT NULL,
  "themeId"      TEXT NOT NULL,
  "fontId"       TEXT NOT NULL DEFAULT 'system',
  "decorationId" TEXT NOT NULL DEFAULT 'none',
  "customBg"     TEXT,
  "customText"   TEXT,
  "customAccent" TEXT,
  "bgGradient"   JSONB,
  "slides"       JSONB NOT NULL DEFAULT '[]',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScreenshotTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScreenshotTemplate_teamId_idx" ON "ScreenshotTemplate"("teamId");

ALTER TABLE "ScreenshotTemplate"
  ADD CONSTRAINT "ScreenshotTemplate_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
