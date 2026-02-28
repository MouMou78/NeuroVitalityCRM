-- Migration 0004: Notification preferences and in-app notifications

-- Add notification preferences to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dealAlertEmailEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dealAlertEmailSeverity" text DEFAULT 'medium';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dealAlertInAppEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dealAlertFrequency" text DEFAULT 'immediate';

-- In-app notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" varchar(36) PRIMARY KEY,
  "tenantId" varchar(36) NOT NULL,
  "userId" varchar(36) NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "severity" text DEFAULT 'medium',
  "entityType" text,
  "entityId" varchar(36),
  "entityName" text,
  "actionUrl" text,
  "read" boolean DEFAULT false NOT NULL,
  "readAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_tenant_user_idx" ON "notifications" ("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("tenantId", "userId", "read");
