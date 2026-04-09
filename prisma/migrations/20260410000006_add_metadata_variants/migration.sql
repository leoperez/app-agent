-- CreateTable
CREATE TABLE "MetadataVariant" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "keywords" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetadataVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetadataVariant_appId_locale_idx" ON "MetadataVariant"("appId", "locale");

-- AddForeignKey
ALTER TABLE "MetadataVariant" ADD CONSTRAINT "MetadataVariant_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
