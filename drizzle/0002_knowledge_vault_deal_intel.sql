-- Knowledge Vault table
CREATE TABLE IF NOT EXISTS "knowledgeVault" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "uploadedByUserId" varchar(36) NOT NULL,
  "sourceType" varchar(50) NOT NULL,
  "title" varchar(500) NOT NULL,
  "sourceUrl" text,
  "storageKey" text,
  "fileName" varchar(500),
  "fileSize" integer,
  "mimeType" varchar(100),
  "category" varchar(100),
  "tags" text,
  "extractedContent" text,
  "aiSummary" text,
  "extractedMemories" text,
  "status" varchar(50) DEFAULT 'processing' NOT NULL,
  "processingError" text,
  "memoryInjected" boolean DEFAULT false NOT NULL,
  "linkedEntityType" varchar(50),
  "linkedEntityId" varchar(36),
  "linkedEntityName" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Deal Intelligence Alerts table
CREATE TABLE IF NOT EXISTS "dealIntelligenceAlerts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "dealId" varchar(36) NOT NULL,
  "dealName" varchar(500) NOT NULL,
  "alertType" varchar(50) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "message" text NOT NULL,
  "recommendation" text,
  "confidence" integer DEFAULT 70 NOT NULL,
  "patternData" text,
  "isRead" boolean DEFAULT false NOT NULL,
  "isDismissed" boolean DEFAULT false NOT NULL,
  "actionTaken" boolean DEFAULT false NOT NULL,
  "actionNote" text,
  "expiresAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "kv_tenant_idx" ON "knowledgeVault" ("tenantId");
CREATE INDEX IF NOT EXISTS "kv_category_idx" ON "knowledgeVault" ("tenantId", "category");
CREATE INDEX IF NOT EXISTS "kv_status_idx" ON "knowledgeVault" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "dia_tenant_idx" ON "dealIntelligenceAlerts" ("tenantId");
CREATE INDEX IF NOT EXISTS "dia_deal_idx" ON "dealIntelligenceAlerts" ("dealId");
CREATE INDEX IF NOT EXISTS "dia_unread_idx" ON "dealIntelligenceAlerts" ("tenantId", "isRead", "isDismissed");
