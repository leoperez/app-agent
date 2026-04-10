CREATE TABLE "MetadataHistory" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "keywords" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "pushedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetadataHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetadataHistory_appId_locale_pushedAt_idx" ON "MetadataHistory"("appId", "locale", "pushedAt");

ALTER TABLE "MetadataHistory" ADD CONSTRAINT "MetadataHistory_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
