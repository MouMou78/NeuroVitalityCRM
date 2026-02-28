-- Migration 0005: Sequencing Engine core tables

-- Canonical event store (idempotent ingestion)
CREATE TABLE IF NOT EXISTS "crmEvents" (
  "event_id" varchar(36) PRIMARY KEY,
  "tenant_id" varchar(36) NOT NULL,
  "event_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" varchar(36) NOT NULL,
  "source" text NOT NULL,
  "occurred_at" timestamp NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "payload" json,
  "dedupe_key" text NOT NULL,
  "processed" boolean DEFAULT false NOT NULL,
  CONSTRAINT "crm_events_dedupe_unique" UNIQUE ("dedupe_key")
);
CREATE INDEX IF NOT EXISTS "crm_events_tenant_idx" ON "crmEvents" ("tenant_id");
CREATE INDEX IF NOT EXISTS "crm_events_entity_idx" ON "crmEvents" ("entity_id", "event_type");
CREATE INDEX IF NOT EXISTS "crm_events_occurred_idx" ON "crmEvents" ("occurred_at");

-- Lead scoring with decay
CREATE TABLE IF NOT EXISTS "leadScores" (
  "id" varchar(36) PRIMARY KEY,
  "tenant_id" varchar(36) NOT NULL,
  "entity_id" varchar(36) NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "tier" text DEFAULT 'cold' NOT NULL,
  "last_activity_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lead_scores_tenant_entity_idx" ON "leadScores" ("tenant_id", "entity_id");

-- Global suppression list
CREATE TABLE IF NOT EXISTS "suppressionList" (
  "id" varchar(36) PRIMARY KEY,
  "tenant_id" varchar(36) NOT NULL,
  "email" text NOT NULL,
  "reason" text NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "suppression_tenant_email_idx" ON "suppressionList" ("tenant_id", "email");

-- Workflow definitions (versioned graph JSON)
CREATE TABLE IF NOT EXISTS "workflowDefinitions" (
  "id" varchar(36) PRIMARY KEY,
  "workflow_id" varchar(36) NOT NULL,
  "tenant_id" varchar(36) NOT NULL,
  "name" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "definition" json NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "workflow_def_tenant_idx" ON "workflowDefinitions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "workflow_def_workflow_idx" ON "workflowDefinitions" ("workflow_id");

-- Lead enrollment state machine
CREATE TABLE IF NOT EXISTS "workflowEnrollments" (
  "enrollment_id" varchar(36) PRIMARY KEY,
  "workflow_id" varchar(36) NOT NULL,
  "tenant_id" varchar(36) NOT NULL,
  "entity_id" varchar(36) NOT NULL,
  "current_node_id" varchar(36) NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "outcome" text,
  "entered_at" timestamp DEFAULT now() NOT NULL,
  "last_transition_at" timestamp DEFAULT now() NOT NULL,
  "next_check_at" timestamp,
  "state_snapshot" json
);
CREATE INDEX IF NOT EXISTS "enrollment_tenant_entity_idx" ON "workflowEnrollments" ("tenant_id", "entity_id");
CREATE INDEX IF NOT EXISTS "enrollment_status_idx" ON "workflowEnrollments" ("status", "next_check_at");

-- Nurture track enrollments
CREATE TABLE IF NOT EXISTS "nurtureEnrollments" (
  "id" varchar(36) PRIMARY KEY,
  "tenant_id" varchar(36) NOT NULL,
  "entity_id" varchar(36) NOT NULL,
  "nurture_workflow_id" varchar(36) NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "next_send_at" timestamp,
  "content_index" integer DEFAULT 0 NOT NULL,
  "enrolled_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp
);
CREATE INDEX IF NOT EXISTS "nurture_enrollment_tenant_entity_idx" ON "nurtureEnrollments" ("tenant_id", "entity_id");
