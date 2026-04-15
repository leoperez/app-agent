-- CreateTable: StoreCredential (per-app/per-team store API credentials)
CREATE TABLE "StoreCredential" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "privateKey" TEXT,
    "keyId" TEXT,
    "issuerId" TEXT,
    "jwt" TEXT,
    "jwtExpiresAt" TIMESTAMP(3),
    "serviceAccountKey" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreCredential_teamId_idx" ON "StoreCredential"("teamId");

-- AddForeignKey
ALTER TABLE "StoreCredential" ADD CONSTRAINT "StoreCredential_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: App — add optional credentialId
ALTER TABLE "App" ADD COLUMN "credentialId" TEXT;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_credentialId_fkey"
    FOREIGN KEY ("credentialId") REFERENCES "StoreCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: User — add granular notification prefs
ALTER TABLE "User" ADD COLUMN "notifyKeywordDrop" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyKeywordRise" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyRatingDrop" BOOLEAN NOT NULL DEFAULT true;
