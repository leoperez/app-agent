CREATE TABLE "DescriptionTemplate" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "keywords" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescriptionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DescriptionTemplate_teamId_store_idx" ON "DescriptionTemplate"("teamId", "store");

ALTER TABLE "DescriptionTemplate" ADD CONSTRAINT "DescriptionTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
