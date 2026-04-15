-- Add scheduledPublishAt to AppVersion
ALTER TABLE "AppVersion" ADD COLUMN "scheduledPublishAt" TIMESTAMP(3);

-- PushSubscription table for web push notifications
CREATE TABLE "PushSubscription" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "endpoint"  TEXT NOT NULL,
    "p256dh"    TEXT NOT NULL,
    "auth"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AuditLog table
CREATE TABLE "AuditLog" (
    "id"         TEXT NOT NULL,
    "teamId"     TEXT NOT NULL,
    "userId"     TEXT,
    "userEmail"  TEXT,
    "action"     TEXT NOT NULL,
    "entity"     TEXT NOT NULL,
    "entityId"   TEXT,
    "appId"      TEXT,
    "meta"       JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_teamId_createdAt_idx" ON "AuditLog"("teamId", "createdAt");
CREATE INDEX "AuditLog_teamId_entity_idx"    ON "AuditLog"("teamId", "entity");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
