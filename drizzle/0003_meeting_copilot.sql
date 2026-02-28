-- Meeting Co-pilot: Phase 1 Schema
-- Tables: meetingSessions, meetingTranscripts, meetingCopilotSuggestions

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetingSessions" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "dealId" varchar(36),
  "personId" varchar(36),
  "accountId" varchar(36),
  "initiatedByUserId" varchar(36) NOT NULL,
  "title" text,
  "meetingUrl" text NOT NULL,
  "platform" varchar(50) NOT NULL DEFAULT 'google_meet',
  "recallBotId" text,
  "status" varchar(50) NOT NULL DEFAULT 'pending',
  "startedAt" timestamp,
  "endedAt" timestamp,
  "durationSeconds" integer,
  "summaryMarkdown" text,
  "actionItems" json,
  "dealStageRecommendation" text,
  "sentimentScore" real,
  "talkRatio" json,
  "keyTopics" json,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetingTranscripts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "sessionId" varchar(36) NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "speaker" text,
  "speakerType" varchar(20) DEFAULT 'unknown',
  "text" text NOT NULL,
  "confidence" real,
  "startMs" integer,
  "endMs" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetingCopilotSuggestions" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "sessionId" varchar(36) NOT NULL,
  "tenantId" varchar(36) NOT NULL,
  "type" varchar(50) NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "triggerText" text,
  "confidence" real,
  "dismissed" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_session_tenant_idx" ON "meetingSessions" ("tenantId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_session_deal_idx" ON "meetingSessions" ("dealId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_transcript_session_idx" ON "meetingTranscripts" ("sessionId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_suggestion_session_idx" ON "meetingCopilotSuggestions" ("sessionId");
