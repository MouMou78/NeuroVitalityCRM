CREATE TABLE "account_tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"accountId" varchar(36) NOT NULL,
	"tagId" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_tag_unique" UNIQUE("accountId","tagId")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"industry" text,
	"employees" varchar(50),
	"revenue" varchar(100),
	"technologies" json,
	"headquarters" text,
	"foundingYear" integer,
	"lastFundingRound" varchar(100),
	"firstContacted" timestamp,
	"linkedinUrl" varchar(500),
	"enrichmentSource" text,
	"enrichmentSnapshot" json,
	"integrationId" varchar(36),
	"amplemarketUserId" varchar(100),
	"amplemarketExternalId" varchar(100),
	"fitScore" integer DEFAULT 0,
	"intentScore" integer DEFAULT 0,
	"combinedScore" integer DEFAULT 0,
	"fitTier" text,
	"intentTier" text,
	"scoreReasons" json,
	"lifecycleStage" text DEFAULT 'Lead',
	"lifecycleStageEnteredAt" timestamp,
	"ownerUserId" varchar(36),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"personId" varchar(36),
	"accountId" varchar(36),
	"userId" varchar(36),
	"activityType" text NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"metadata" json,
	"externalSource" varchar(100),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activityFeed" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"actionType" text NOT NULL,
	"entityType" text,
	"entityId" varchar(36),
	"entityName" text,
	"description" text,
	"metadata" json DEFAULT '{}'::json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aiConversations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"messages" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amplemarketListCache" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"listId" varchar(100) NOT NULL,
	"listName" varchar(500) NOT NULL,
	"owner" varchar(320),
	"shared" boolean DEFAULT false,
	"contactCount" integer NOT NULL,
	"lastFetchedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_list_unique" UNIQUE("tenantId","listId")
);
--> statement-breakpoint
CREATE TABLE "amplemarketSyncLogs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"syncType" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"contactsCreated" integer DEFAULT 0,
	"contactsUpdated" integer DEFAULT 0,
	"contactsMerged" integer DEFAULT 0,
	"contactsSkipped" integer DEFAULT 0,
	"contactsFetched" integer DEFAULT 0,
	"contactsKept" integer DEFAULT 0,
	"contactsDiscarded" integer DEFAULT 0,
	"missingOwnerField" integer DEFAULT 0,
	"conflictsDetected" integer DEFAULT 0,
	"correlationId" varchar(36),
	"listIdsScannedCount" integer DEFAULT 0,
	"leadIdsFetchedTotal" integer DEFAULT 0,
	"leadIdsDedupedTotal" integer DEFAULT 0,
	"contactsHydratedTotal" integer DEFAULT 0,
	"contactsWithOwnerFieldCount" integer DEFAULT 0,
	"keptOwnerMatch" integer DEFAULT 0,
	"discardedOwnerMismatch" integer DEFAULT 0,
	"created" integer DEFAULT 0,
	"updated" integer DEFAULT 0,
	"skipped" integer DEFAULT 0,
	"reason" varchar(100),
	"errors" json,
	"errorMessage" text,
	"diagnosticMessage" text,
	"metadata" json,
	"triggeredBy" varchar(36),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automationExecutions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"ruleId" varchar(36) NOT NULL,
	"threadId" varchar(36),
	"personId" varchar(36),
	"status" text NOT NULL,
	"executedAt" timestamp DEFAULT now() NOT NULL,
	"errorMessage" text,
	"metadata" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "automationRules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"triggerType" text NOT NULL,
	"triggerConfig" json DEFAULT '{}'::json,
	"actionType" text NOT NULL,
	"actionConfig" json DEFAULT '{}'::json,
	"conditions" json DEFAULT '{"logic":"AND","rules":[]}'::json,
	"priority" integer DEFAULT 0 NOT NULL,
	"schedule" text,
	"timezone" text DEFAULT 'UTC',
	"nextRunAt" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarEvents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"integrationId" varchar(36) NOT NULL,
	"externalEventId" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"location" text,
	"attendees" json DEFAULT '[]'::json,
	"isAllDay" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"linkedContactId" varchar(36),
	"linkedAccountId" varchar(36),
	"linkedDealId" varchar(36),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarIntegrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"expiresAt" timestamp,
	"calendarId" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSyncAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaignRecipients" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaignId" varchar(36) NOT NULL,
	"personId" varchar(36) NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"openedAt" timestamp,
	"clickedAt" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "channelMembers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"channelId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastReadAt" timestamp,
	CONSTRAINT "channel_user_unique" UNIQUE("channelId","userId")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" text DEFAULT 'public' NOT NULL,
	"createdBy" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"archivedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "dealStages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"color" varchar(20) DEFAULT '#3b82f6',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"stageId" varchar(36) NOT NULL,
	"accountId" varchar(36),
	"contactId" varchar(36),
	"ownerUserId" varchar(36),
	"expectedCloseDate" timestamp,
	"probability" integer DEFAULT 50,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_bookings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"salesManagerId" varchar(36) NOT NULL,
	"bookedByUserId" varchar(36) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"meetLink" varchar(500) NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "directMessages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"senderId" varchar(36) NOT NULL,
	"recipientId" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "documentFolders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"parentFolderId" varchar(36),
	"createdById" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentVersions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"documentId" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" integer,
	"uploadedById" varchar(36) NOT NULL,
	"changeNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"fileKey" varchar(500) NOT NULL,
	"fileUrl" text NOT NULL,
	"mimeType" varchar(100),
	"fileSize" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"linkedEntityType" text,
	"linkedEntityId" varchar(36),
	"folderId" varchar(36),
	"uploadedById" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailAccounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"email" varchar(320) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"smtpHost" text,
	"smtpPort" integer,
	"smtpUser" text,
	"smtpPass" text,
	"imapHost" text,
	"imapPort" integer,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailExamples" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"context" text,
	"category" varchar(100),
	"performanceMetrics" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailSequenceEnrollments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"sequenceId" varchar(36) NOT NULL,
	"personId" varchar(36) NOT NULL,
	"threadId" varchar(36),
	"currentStep" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"enrolledAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"lastEmailSentAt" timestamp,
	"nextEmailScheduledAt" timestamp,
	"totalOpens" integer DEFAULT 0 NOT NULL,
	"totalReplies" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailSequenceEvents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"enrollmentId" varchar(36) NOT NULL,
	"stepNumber" integer NOT NULL,
	"eventType" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "emailSequenceSteps" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sequenceId" varchar(36) NOT NULL,
	"stepNumber" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"delayDays" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailSequences" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailTemplates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"content" json NOT NULL,
	"variables" json DEFAULT '[]'::json,
	"category" varchar(100),
	"isPublic" boolean DEFAULT false NOT NULL,
	"createdById" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailTrackingEvents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"emailId" varchar(36) NOT NULL,
	"personId" varchar(36),
	"eventType" text NOT NULL,
	"clickedUrl" text,
	"userAgent" text,
	"ipAddress" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollmentPathHistory" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"enrollmentId" varchar(36) NOT NULL,
	"nodeId" varchar(36) NOT NULL,
	"enteredAt" timestamp DEFAULT now() NOT NULL,
	"exitedAt" timestamp,
	"edgeTaken" varchar(36),
	"metadata" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"startsAt" timestamp,
	"endsAt" timestamp,
	"formSchema" json,
	"defaultIntent" text DEFAULT 'warm_intro' NOT NULL,
	"defaultTags" json DEFAULT '[]'::json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("tenantId","slug")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"config" json DEFAULT '{}'::json,
	"oauthTokens" json,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_provider_unique" UNIQUE("tenantId","provider")
);
--> statement-breakpoint
CREATE TABLE "leadScores" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"personId" varchar(36) NOT NULL,
	"engagementScore" integer DEFAULT 0 NOT NULL,
	"demographicScore" integer DEFAULT 0 NOT NULL,
	"behaviorScore" integer DEFAULT 0 NOT NULL,
	"totalScore" integer DEFAULT 0 NOT NULL,
	"emailOpens" integer DEFAULT 0 NOT NULL,
	"emailClicks" integer DEFAULT 0 NOT NULL,
	"emailReplies" integer DEFAULT 0 NOT NULL,
	"websiteVisits" integer DEFAULT 0 NOT NULL,
	"formSubmissions" integer DEFAULT 0 NOT NULL,
	"lastActivityAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadScoringRules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"points" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"source" varchar(50) NOT NULL,
	"sourceType" varchar(50) NOT NULL,
	"amplemarketLeadId" varchar(255),
	"ownerEmail" varchar(320),
	"email" varchar(320) NOT NULL,
	"firstName" varchar(255),
	"lastName" varchar(255),
	"company" varchar(255),
	"title" varchar(255),
	"linkedinUrl" text,
	"listIds" json,
	"sequenceIds" json,
	"syncedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amplemarket_lead_id_unique" UNIQUE("tenantId","amplemarketLeadId")
);
--> statement-breakpoint
CREATE TABLE "marketingCampaigns" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduledAt" timestamp,
	"sentAt" timestamp,
	"recipientCount" integer DEFAULT 0 NOT NULL,
	"openCount" integer DEFAULT 0 NOT NULL,
	"clickCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messageReactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"messageId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_user_emoji_unique" UNIQUE("messageId","userId","emoji")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"channelId" varchar(36),
	"userId" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"threadId" varchar(36),
	"fileUrl" text,
	"fileName" varchar(255),
	"fileType" varchar(100),
	"fileSize" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"threadId" varchar(36) NOT NULL,
	"personId" varchar(36) NOT NULL,
	"source" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"externalId" varchar(255),
	"externalSource" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nextActions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"threadId" varchar(36) NOT NULL,
	"actionType" text NOT NULL,
	"triggerType" text NOT NULL,
	"triggerValue" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assignedUserId" integer,
	"dueAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" varchar(36) NOT NULL,
	"createdBy" varchar(36) NOT NULL,
	"createdByName" varchar(255) NOT NULL,
	"updatedBy" varchar(36),
	"updatedByName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"type" text NOT NULL,
	"messageId" varchar(36),
	"channelId" varchar(36),
	"content" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"accountId" varchar(36),
	"fullName" text NOT NULL,
	"firstName" varchar(100),
	"lastName" varchar(100),
	"primaryEmail" varchar(320) NOT NULL,
	"secondaryEmails" json DEFAULT '[]'::json,
	"companyName" text,
	"companyDomain" varchar(255),
	"companySize" varchar(50),
	"roleTitle" text,
	"simplifiedTitle" text,
	"buyingRole" varchar(50),
	"phone" varchar(50),
	"manuallyAddedNumber" varchar(50),
	"manuallyAddedNumberDncStatus" varchar(20),
	"sourcedNumber" varchar(50),
	"sourcedNumberDncStatus" varchar(20),
	"mobileNumber" varchar(50),
	"mobileNumberDncStatus" varchar(20),
	"workNumber" varchar(50),
	"workNumberDncStatus" varchar(20),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"location" text,
	"linkedinUrl" varchar(500),
	"industry" text,
	"status" varchar(50),
	"numberOfOpens" integer DEFAULT 0,
	"label" varchar(100),
	"meetingBooked" boolean DEFAULT false,
	"owner" varchar(320),
	"sequenceName" text,
	"sequenceTemplateName" text,
	"savedSearchOrLeadListName" text,
	"mailbox" varchar(320),
	"contactUrl" varchar(500),
	"replied" boolean DEFAULT false,
	"engagementScore" integer DEFAULT 0,
	"lastStageExecuted" integer,
	"lastStageExecutedAt" timestamp,
	"notes" text,
	"tags" json DEFAULT '[]'::json,
	"fitScore" integer DEFAULT 0,
	"intentScore" integer DEFAULT 0,
	"combinedScore" integer DEFAULT 0,
	"fitTier" text,
	"intentTier" text,
	"scoreReasons" json,
	"lifecycleStage" text DEFAULT 'Lead',
	"lifecycleStageEnteredAt" timestamp,
	"seniority" text,
	"department" varchar(100),
	"region" varchar(100),
	"enrichmentSource" text,
	"enrichmentSnapshot" json,
	"enrichmentLastSyncedAt" timestamp,
	"integrationId" varchar(36),
	"amplemarketUserId" varchar(100),
	"amplemarketExternalId" varchar(100),
	"assignedToUserId" varchar(36),
	"assignedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_primary_email_unique" UNIQUE("tenantId","primaryEmail")
);
--> statement-breakpoint
CREATE TABLE "person_tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"personId" varchar(36) NOT NULL,
	"tagId" varchar(36) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_tag_unique" UNIQUE("personId","tagId")
);
--> statement-breakpoint
CREATE TABLE "sequenceEdges" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sequenceId" varchar(36) NOT NULL,
	"sourceNodeId" varchar(36) NOT NULL,
	"targetNodeId" varchar(36) NOT NULL,
	"edgeType" text DEFAULT 'default' NOT NULL,
	"label" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequenceNodes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sequenceId" varchar(36) NOT NULL,
	"nodeType" text NOT NULL,
	"position" json NOT NULL,
	"subject" text,
	"body" text,
	"waitDays" integer,
	"waitUntilTime" varchar(20),
	"conditionType" text,
	"conditionConfig" json,
	"variantAPercentage" integer,
	"goalType" text,
	"label" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sharedViews" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"viewType" text NOT NULL,
	"filters" json DEFAULT '{}'::json,
	"sortBy" varchar(100),
	"sortOrder" text DEFAULT 'asc',
	"createdById" varchar(36) NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"sharedWithUserIds" json DEFAULT '[]'::json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syncHistory" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"syncType" varchar(50) NOT NULL,
	"status" text NOT NULL,
	"recordsSynced" integer DEFAULT 0 NOT NULL,
	"conflictsResolved" integer DEFAULT 0 NOT NULL,
	"errors" json,
	"config" json,
	"startedAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#3b82f6',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_tag_name_unique" UNIQUE("tenantId","name")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"dueDate" timestamp,
	"assignedToId" varchar(36),
	"createdById" varchar(36) NOT NULL,
	"linkedEntityType" text,
	"linkedEntityId" varchar(36),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"reminderAt" timestamp,
	"reminderSent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templateAnalytics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"templateId" varchar(100) NOT NULL,
	"installCount" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"lastInstalledAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templateAnalytics_templateId_unique" UNIQUE("templateId")
);
--> statement-breakpoint
CREATE TABLE "templateReviews" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"templateId" varchar(100) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templateVersions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"templateId" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"triggerType" text NOT NULL,
	"triggerConfig" json DEFAULT '{}'::json,
	"actionType" text NOT NULL,
	"actionConfig" json DEFAULT '{}'::json,
	"conditions" json DEFAULT '{"logic":"AND","rules":[]}'::json,
	"priority" integer DEFAULT 0 NOT NULL,
	"changelog" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"personId" varchar(36) NOT NULL,
	"source" text NOT NULL,
	"intent" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text,
	"lastActivityAt" timestamp,
	"ownerUserId" integer,
	"collaboratorUserIds" json,
	"visibility" varchar(20) DEFAULT 'private',
	"dealSignal" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trackingEvents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"personId" varchar(36),
	"accountId" varchar(36),
	"eventType" text NOT NULL,
	"eventData" json DEFAULT '{}'::json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typingIndicators" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"channelId" varchar(36) NOT NULL,
	"userId" varchar(36) NOT NULL,
	"lastTypingAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_user_typing_unique" UNIQUE("channelId","userId")
);
--> statement-breakpoint
CREATE TABLE "userTemplates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36) NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"triggerType" text NOT NULL,
	"triggerConfig" json DEFAULT '{}'::json,
	"actionType" text NOT NULL,
	"actionConfig" json DEFAULT '{}'::json,
	"conditions" json DEFAULT '{"logic":"AND","rules":[]}'::json,
	"priority" integer DEFAULT 0 NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"baseTemplateId" varchar(100),
	"version" integer DEFAULT 1 NOT NULL,
	"changelog" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"twoFactorSecret" text,
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"backupCodes" json,
	"passwordResetToken" text,
	"passwordResetExpires" timestamp,
	"disabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_email_unique" UNIQUE("tenantId","email")
);
--> statement-breakpoint
CREATE TABLE "webhookEvents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenantId" varchar(36) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"payload" json NOT NULL,
	"headers" json,
	"processedAt" timestamp,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_idx" ON "account_tags" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "tag_idx_1" ON "account_tags" USING btree ("tagId");--> statement-breakpoint
CREATE INDEX "tenant_domain_idx" ON "accounts" USING btree ("tenantId","domain");--> statement-breakpoint
CREATE INDEX "tenant_account_name_idx" ON "accounts" USING btree ("tenantId","name");--> statement-breakpoint
CREATE INDEX "activities_person_idx" ON "activities" USING btree ("personId");--> statement-breakpoint
CREATE INDEX "activities_account_idx" ON "activities" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "activities_type_idx" ON "activities" USING btree ("activityType");--> statement-breakpoint
CREATE INDEX "activities_timestamp_idx" ON "activities" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activity_tenant_idx" ON "activityFeed" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activityFeed" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activity_entity_idx" ON "activityFeed" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activityFeed" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "user_conversations_idx" ON "aiConversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tenant_conversations_idx" ON "aiConversations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "updated_conversations_idx" ON "aiConversations" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "amplemarket_list_cache_tenant_idx" ON "amplemarketListCache" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "amplemarket_sync_logs_tenant_idx" ON "amplemarketSyncLogs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "amplemarket_sync_logs_status_idx" ON "amplemarketSyncLogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "amplemarket_sync_logs_started_idx" ON "amplemarketSyncLogs" USING btree ("startedAt");--> statement-breakpoint
CREATE INDEX "tenant_rule_idx" ON "automationExecutions" USING btree ("tenantId","ruleId");--> statement-breakpoint
CREATE INDEX "tenant_thread_idx" ON "automationExecutions" USING btree ("tenantId","threadId");--> statement-breakpoint
CREATE INDEX "tenant_executed_idx" ON "automationExecutions" USING btree ("tenantId","executedAt");--> statement-breakpoint
CREATE INDEX "tenant_status_idx_4" ON "automationRules" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tenant_trigger_idx" ON "automationRules" USING btree ("tenantId","triggerType");--> statement-breakpoint
CREATE INDEX "calendar_events_tenant_idx" ON "calendarEvents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "calendar_events_integration_idx" ON "calendarEvents" USING btree ("integrationId");--> statement-breakpoint
CREATE INDEX "calendar_events_external_idx" ON "calendarEvents" USING btree ("externalEventId");--> statement-breakpoint
CREATE INDEX "calendar_events_start_idx" ON "calendarEvents" USING btree ("startTime");--> statement-breakpoint
CREATE INDEX "calendar_events_contact_idx" ON "calendarEvents" USING btree ("linkedContactId");--> statement-breakpoint
CREATE INDEX "calendar_integrations_tenant_idx" ON "calendarIntegrations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "calendar_integrations_user_idx" ON "calendarIntegrations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "recipients_campaign_idx" ON "campaignRecipients" USING btree ("campaignId");--> statement-breakpoint
CREATE INDEX "recipients_person_idx" ON "campaignRecipients" USING btree ("personId");--> statement-breakpoint
CREATE INDEX "user_idx_2" ON "channelMembers" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tenant_idx_1" ON "channels" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "tenant_name_idx_1" ON "channels" USING btree ("tenantId","name");--> statement-breakpoint
CREATE INDEX "deal_stages_tenant_idx" ON "dealStages" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "deal_stages_tenant_order_idx" ON "dealStages" USING btree ("tenantId","order");--> statement-breakpoint
CREATE INDEX "deals_tenant_idx" ON "deals" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "deals_account_idx" ON "deals" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "demo_tenant_manager_idx" ON "demo_bookings" USING btree ("tenantId","salesManagerId");--> statement-breakpoint
CREATE INDEX "demo_start_time_idx" ON "demo_bookings" USING btree ("startTime");--> statement-breakpoint
CREATE INDEX "tenant_sender_recipient_idx" ON "directMessages" USING btree ("tenantId","senderId","recipientId");--> statement-breakpoint
CREATE INDEX "tenant_recipient_idx" ON "directMessages" USING btree ("tenantId","recipientId");--> statement-breakpoint
CREATE INDEX "created_idx" ON "directMessages" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "document_folders_tenant_idx" ON "documentFolders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "document_folders_parent_idx" ON "documentFolders" USING btree ("parentFolderId");--> statement-breakpoint
CREATE INDEX "document_versions_document_idx" ON "documentVersions" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "document_versions_version_idx" ON "documentVersions" USING btree ("documentId","version");--> statement-breakpoint
CREATE INDEX "documents_tenant_idx" ON "documents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("linkedEntityType","linkedEntityId");--> statement-breakpoint
CREATE INDEX "documents_folder_idx" ON "documents" USING btree ("folderId");--> statement-breakpoint
CREATE INDEX "documents_uploader_idx" ON "documents" USING btree ("uploadedById");--> statement-breakpoint
CREATE INDEX "email_accounts_tenant_idx" ON "emailAccounts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "email_accounts_user_idx" ON "emailAccounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "email_examples_user_idx" ON "emailExamples" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "email_examples_category_idx" ON "emailExamples" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tenant_sequence_idx" ON "emailSequenceEnrollments" USING btree ("tenantId","sequenceId");--> statement-breakpoint
CREATE INDEX "tenant_person_idx_1" ON "emailSequenceEnrollments" USING btree ("tenantId","personId");--> statement-breakpoint
CREATE INDEX "tenant_status_idx_3" ON "emailSequenceEnrollments" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tenant_scheduled_idx" ON "emailSequenceEnrollments" USING btree ("tenantId","nextEmailScheduledAt");--> statement-breakpoint
CREATE INDEX "enrollment_timestamp_idx" ON "emailSequenceEvents" USING btree ("enrollmentId","timestamp");--> statement-breakpoint
CREATE INDEX "enrollment_step_idx" ON "emailSequenceEvents" USING btree ("enrollmentId","stepNumber");--> statement-breakpoint
CREATE INDEX "sequence_step_idx" ON "emailSequenceSteps" USING btree ("sequenceId","stepNumber");--> statement-breakpoint
CREATE INDEX "tenant_status_idx_2" ON "emailSequences" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "email_templates_tenant_idx" ON "emailTemplates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "email_templates_category_idx" ON "emailTemplates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "email_tracking_email_idx" ON "emailTrackingEvents" USING btree ("emailId");--> statement-breakpoint
CREATE INDEX "email_tracking_person_idx" ON "emailTrackingEvents" USING btree ("personId");--> statement-breakpoint
CREATE INDEX "email_tracking_type_idx" ON "emailTrackingEvents" USING btree ("eventType");--> statement-breakpoint
CREATE INDEX "email_tracking_timestamp_idx" ON "emailTrackingEvents" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "enrollment_node_idx" ON "enrollmentPathHistory" USING btree ("enrollmentId","nodeId");--> statement-breakpoint
CREATE INDEX "enrollment_time_idx" ON "enrollmentPathHistory" USING btree ("enrollmentId","enteredAt");--> statement-breakpoint
CREATE INDEX "lead_scores_tenant_idx" ON "leadScores" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "lead_scores_person_idx" ON "leadScores" USING btree ("personId");--> statement-breakpoint
CREATE INDEX "lead_scores_total_idx" ON "leadScores" USING btree ("totalScore");--> statement-breakpoint
CREATE INDEX "lead_scoring_rules_tenant_idx" ON "leadScoringRules" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "lead_scoring_rules_category_idx" ON "leadScoringRules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tenant_idx_2" ON "leads" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "owner_email_idx" ON "leads" USING btree ("ownerEmail");--> statement-breakpoint
CREATE INDEX "campaigns_tenant_idx" ON "marketingCampaigns" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "campaigns_user_idx" ON "marketingCampaigns" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "marketingCampaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_idx" ON "messageReactions" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "tenant_channel_idx" ON "messages" USING btree ("tenantId","channelId");--> statement-breakpoint
CREATE INDEX "channel_created_idx" ON "messages" USING btree ("channelId","createdAt");--> statement-breakpoint
CREATE INDEX "thread_idx" ON "messages" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX "tenant_thread_timestamp_idx" ON "moments" USING btree ("tenantId","threadId","timestamp");--> statement-breakpoint
CREATE INDEX "tenant_person_timestamp_idx" ON "moments" USING btree ("tenantId","personId","timestamp");--> statement-breakpoint
CREATE INDEX "tenant_status_idx_1" ON "nextActions" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tenant_assigned_idx" ON "nextActions" USING btree ("tenantId","assignedUserId","status");--> statement-breakpoint
CREATE INDEX "tenant_due_idx" ON "nextActions" USING btree ("tenantId","dueAt");--> statement-breakpoint
CREATE INDEX "tenant_thread_status_idx" ON "nextActions" USING btree ("tenantId","threadId","status");--> statement-breakpoint
CREATE INDEX "notes_tenant_idx" ON "notes" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "notes_entity_idx" ON "notes" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "notes_created_by_idx" ON "notes" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "notes_created_at_idx" ON "notes" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "user_read_idx" ON "notifications" USING btree ("userId","isRead");--> statement-breakpoint
CREATE INDEX "created_idx_1" ON "notifications" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "tenant_name_idx" ON "people" USING btree ("tenantId","fullName");--> statement-breakpoint
CREATE INDEX "person_idx" ON "person_tags" USING btree ("personId");--> statement-breakpoint
CREATE INDEX "tag_idx" ON "person_tags" USING btree ("tagId");--> statement-breakpoint
CREATE INDEX "sequence_edge_idx" ON "sequenceEdges" USING btree ("sequenceId");--> statement-breakpoint
CREATE INDEX "source_node_idx" ON "sequenceEdges" USING btree ("sourceNodeId");--> statement-breakpoint
CREATE INDEX "sequence_node_idx" ON "sequenceNodes" USING btree ("sequenceId");--> statement-breakpoint
CREATE INDEX "shared_views_tenant_idx" ON "sharedViews" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "shared_views_creator_idx" ON "sharedViews" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "shared_views_type_idx" ON "sharedViews" USING btree ("viewType");--> statement-breakpoint
CREATE INDEX "tasks_tenant_idx" ON "tasks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "tasks_assigned_idx" ON "tasks" USING btree ("assignedToId");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "tasks" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "tasks_linked_idx" ON "tasks" USING btree ("linkedEntityType","linkedEntityId");--> statement-breakpoint
CREATE INDEX "template_idx_1" ON "templateAnalytics" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "template_idx" ON "templateReviews" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "user_idx" ON "templateReviews" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "template_idx_2" ON "templateVersions" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "version_idx" ON "templateVersions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "domain_idx" ON "tenants" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "tenant_person_idx" ON "threads" USING btree ("tenantId","personId");--> statement-breakpoint
CREATE INDEX "tenant_status_idx" ON "threads" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tenant_owner_idx" ON "threads" USING btree ("tenantId","ownerUserId");--> statement-breakpoint
CREATE INDEX "tenant_visibility_idx" ON "threads" USING btree ("tenantId","visibility");--> statement-breakpoint
CREATE INDEX "tenant_person_idx_2" ON "trackingEvents" USING btree ("tenantId","personId");--> statement-breakpoint
CREATE INDEX "tenant_account_idx" ON "trackingEvents" USING btree ("tenantId","accountId");--> statement-breakpoint
CREATE INDEX "tenant_timestamp_idx" ON "trackingEvents" USING btree ("tenantId","timestamp");--> statement-breakpoint
CREATE INDEX "tenant_type_idx" ON "trackingEvents" USING btree ("tenantId","eventType");--> statement-breakpoint
CREATE INDEX "channel_typing_idx" ON "typingIndicators" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "last_typing_idx" ON "typingIndicators" USING btree ("lastTypingAt");--> statement-breakpoint
CREATE INDEX "user_idx_1" ON "userTemplates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tenant_idx" ON "userTemplates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "public_idx" ON "userTemplates" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "webhook_events_tenant_idx" ON "webhookEvents" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhookEvents" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_created_idx" ON "webhookEvents" USING btree ("createdAt");