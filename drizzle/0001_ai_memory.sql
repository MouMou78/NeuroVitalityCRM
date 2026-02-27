-- AI Persistent Memory table
-- Stores facts, preferences, and learnings the AI accumulates over time
CREATE TABLE IF NOT EXISTS "aiMemory" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "userId" varchar(36),
  "category" varchar(50) NOT NULL,
  "content" text NOT NULL,
  "entityType" varchar(50),
  "entityId" varchar(36),
  "entityName" varchar(255),
  "importance" integer DEFAULT 5 NOT NULL,
  "reinforceCount" integer DEFAULT 1 NOT NULL,
  "source" varchar(50) DEFAULT 'ai_extracted' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_memory_tenant_idx" ON "aiMemory" ("tenantId");
CREATE INDEX IF NOT EXISTS "ai_memory_category_idx" ON "aiMemory" ("tenantId", "category");
CREATE INDEX IF NOT EXISTS "ai_memory_entity_idx" ON "aiMemory" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ai_memory_user_idx" ON "aiMemory" ("userId");
