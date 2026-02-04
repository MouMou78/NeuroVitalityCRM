import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, unique, boolean } from "drizzle-orm/mysql-core";

/**
 * Multi-tenant CRM schema for KompassCRM
 * Supports tenants, users, people, threads, moments, next_actions, events, and integrations
 */

export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  domainIdx: index("domain_idx").on(table.domain),
}));

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: mysqlEnum("role", ["owner", "collaborator", "restricted"]).default("owner").notNull(),
  twoFactorSecret: text("twoFactorSecret"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  backupCodes: json("backupCodes").$type<string[]>(),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpires: timestamp("passwordResetExpires"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantEmailIdx: unique("tenant_email_unique").on(table.tenantId, table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const accounts = mysqlTable("accounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }),
  industry: text("industry"),
  employees: varchar("employees", { length: 50 }),
  revenue: varchar("revenue", { length: 100 }),
  technologies: json("technologies").$type<string[]>(),
  headquarters: text("headquarters"),
  foundingYear: int("foundingYear"),
  lastFundingRound: varchar("lastFundingRound", { length: 100 }),
  firstContacted: timestamp("firstContacted"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  enrichmentSource: text("enrichmentSource"),
  enrichmentSnapshot: json("enrichmentSnapshot").$type<Record<string, any>>(),
  
  // Lead Scoring Fields
  fitScore: int("fitScore").default(0),
  intentScore: int("intentScore").default(0),
  combinedScore: int("combinedScore").default(0),
  fitTier: mysqlEnum("fitTier", ["A", "B", "C"]),
  intentTier: mysqlEnum("intentTier", ["Hot", "Warm", "Cold"]),
  scoreReasons: json("scoreReasons").$type<string[]>(),
  lifecycleStage: mysqlEnum("lifecycleStage", ["Lead", "MQL", "SQL", "Opportunity", "ClosedWon", "ClosedLost"]).default("Lead"),
  lifecycleStageEnteredAt: timestamp("lifecycleStageEnteredAt"),
  ownerUserId: varchar("ownerUserId", { length: 36 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantDomainIdx: index("tenant_domain_idx").on(table.tenantId, table.domain),
  tenantNameIdx: index("tenant_account_name_idx").on(table.tenantId, table.name),
}));

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export const people = mysqlTable("people", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  accountId: varchar("accountId", { length: 36 }),
  fullName: text("fullName").notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  primaryEmail: varchar("primaryEmail", { length: 320 }).notNull(),
  secondaryEmails: json("secondaryEmails").$type<string[]>().default([]),
  companyName: text("companyName"),
  companyDomain: varchar("companyDomain", { length: 255 }),
  companySize: varchar("companySize", { length: 50 }),
  roleTitle: text("roleTitle"),
  simplifiedTitle: text("simplifiedTitle"),
  phone: varchar("phone", { length: 50 }),
  manuallyAddedNumber: varchar("manuallyAddedNumber", { length: 50 }),
  manuallyAddedNumberDncStatus: varchar("manuallyAddedNumberDncStatus", { length: 20 }),
  sourcedNumber: varchar("sourcedNumber", { length: 50 }),
  sourcedNumberDncStatus: varchar("sourcedNumberDncStatus", { length: 20 }),
  mobileNumber: varchar("mobileNumber", { length: 50 }),
  mobileNumberDncStatus: varchar("mobileNumberDncStatus", { length: 20 }),
  workNumber: varchar("workNumber", { length: 50 }),
  workNumberDncStatus: varchar("workNumberDncStatus", { length: 20 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  location: text("location"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  industry: text("industry"),
  status: varchar("status", { length: 50 }),
  numberOfOpens: int("numberOfOpens").default(0),
  label: varchar("label", { length: 100 }),
  meetingBooked: boolean("meetingBooked").default(false),
  owner: varchar("owner", { length: 320 }),
  sequenceName: text("sequenceName"),
  sequenceTemplateName: text("sequenceTemplateName"),
  savedSearchOrLeadListName: text("savedSearchOrLeadListName"),
  mailbox: varchar("mailbox", { length: 320 }),
  contactUrl: varchar("contactUrl", { length: 500 }),
  replied: boolean("replied").default(false),
  engagementScore: int("engagementScore").default(0),
  lastStageExecuted: int("lastStageExecuted"),
  lastStageExecutedAt: timestamp("lastStageExecutedAt"),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().default([]),
  
  // Lead Scoring Fields
  fitScore: int("fitScore").default(0),
  intentScore: int("intentScore").default(0),
  combinedScore: int("combinedScore").default(0),
  fitTier: mysqlEnum("fitTier", ["A", "B", "C"]),
  intentTier: mysqlEnum("intentTier", ["Hot", "Warm", "Cold"]),
  scoreReasons: json("scoreReasons").$type<string[]>(),
  lifecycleStage: mysqlEnum("lifecycleStage", ["Lead", "MQL", "SQL", "Opportunity", "ClosedWon", "ClosedLost"]).default("Lead"),
  lifecycleStageEnteredAt: timestamp("lifecycleStageEnteredAt"),
  seniority: mysqlEnum("seniority", ["C-Level", "VP", "Director", "Manager", "IC", "Other"]),
  department: varchar("department", { length: 100 }),
  region: varchar("region", { length: 100 }),
  
  enrichmentSource: text("enrichmentSource"),
  enrichmentSnapshot: json("enrichmentSnapshot").$type<Record<string, any>>(),
  enrichmentLastSyncedAt: timestamp("enrichmentLastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantEmailIdx: unique("tenant_primary_email_unique").on(table.tenantId, table.primaryEmail),
  tenantNameIdx: index("tenant_name_idx").on(table.tenantId, table.fullName),
}));

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

export const threads = mysqlTable("threads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  source: text("source").notNull(),
  intent: text("intent").notNull(),
  status: mysqlEnum("status", ["active", "waiting", "dormant", "closed"]).default("active").notNull(),
  title: text("title"),
  lastActivityAt: timestamp("lastActivityAt"),
  ownerUserId: int("ownerUserId"),
  collaboratorUserIds: json("collaboratorUserIds").$type<number[]>(),
  visibility: varchar("visibility", { length: 20 }).default("private"),
  dealSignal: json("dealSignal").$type<{value_estimate?: number; confidence?: 'low'|'medium'|'high'; outcome?: 'won'|'lost'}>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantPersonIdx: index("tenant_person_idx").on(table.tenantId, table.personId),
  tenantStatusIdx: index("tenant_status_idx").on(table.tenantId, table.status),
  tenantOwnerIdx: index("tenant_owner_idx").on(table.tenantId, table.ownerUserId),
  tenantVisibilityIdx: index("tenant_visibility_idx").on(table.tenantId, table.visibility),
}));

export type Thread = typeof threads.$inferSelect;
export type InsertThread = typeof threads.$inferInsert;

export const moments = mysqlTable("moments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  source: text("source").notNull(),
  type: mysqlEnum("type", [
    "email_sent",
    "email_received",
    "reply_received",
    "call_completed",
    "meeting_held",
    "note_added",
    "signal_detected",
    "lead_captured",
    "deal_won",
    "deal_lost"
  ]).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  externalId: varchar("externalId", { length: 255 }),
  externalSource: varchar("externalSource", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantThreadTimestampIdx: index("tenant_thread_timestamp_idx").on(table.tenantId, table.threadId, table.timestamp),
  tenantPersonTimestampIdx: index("tenant_person_timestamp_idx").on(table.tenantId, table.personId, table.timestamp),
}));

export type Moment = typeof moments.$inferSelect;
export type InsertMoment = typeof moments.$inferInsert;

export const nextActions = mysqlTable("nextActions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }).notNull(),
  actionType: text("actionType").notNull(),
  triggerType: text("triggerType").notNull(),
  triggerValue: text("triggerValue").notNull(),
  status: mysqlEnum("status", ["open", "completed", "cancelled"]).default("open").notNull(),
  assignedUserId: int("assignedUserId"),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx").on(table.tenantId, table.status),
  tenantAssignedIdx: index("tenant_assigned_idx").on(table.tenantId, table.assignedUserId, table.status),
  tenantDueIdx: index("tenant_due_idx").on(table.tenantId, table.dueAt),
  tenantThreadStatusIdx: index("tenant_thread_status_idx").on(table.tenantId, table.threadId, table.status),
}));

export type NextAction = typeof nextActions.$inferSelect;
export type InsertNextAction = typeof nextActions.$inferInsert;

export const events = mysqlTable("events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  formSchema: json("formSchema").$type<{
    fields: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
    }>;
  }>(),
  defaultIntent: text("defaultIntent").default("warm_intro").notNull(),
  defaultTags: json("defaultTags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantSlugIdx: unique("tenant_slug_unique").on(table.tenantId, table.slug),
}));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export const integrations = mysqlTable("integrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  provider: mysqlEnum("provider", ["google", "amplemarket", "whatsapp", "apollo"]).notNull(),
  status: mysqlEnum("status", ["connected", "disconnected", "error"]).default("disconnected").notNull(),
  config: json("config").$type<Record<string, any>>().default({}),
  oauthTokens: json("oauthTokens").$type<Record<string, any>>(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantProviderIdx: unique("tenant_provider_unique").on(table.tenantId, table.provider),
}));

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

// Email Sequences
export const emailSequences = mysqlTable("emailSequences", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx").on(table.tenantId, table.status),
}));

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

export const emailSequenceSteps = mysqlTable("emailSequenceSteps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  stepNumber: int("stepNumber").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayDays: int("delayDays").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceStepIdx: index("sequence_step_idx").on(table.sequenceId, table.stepNumber),
}));

export type EmailSequenceStep = typeof emailSequenceSteps.$inferSelect;
export type InsertEmailSequenceStep = typeof emailSequenceSteps.$inferInsert;

export const emailSequenceEnrollments = mysqlTable("emailSequenceEnrollments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }),
  currentStep: int("currentStep").notNull().default(0),
  status: mysqlEnum("status", ["active", "completed", "paused", "unsubscribed"]).default("active").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  nextEmailScheduledAt: timestamp("nextEmailScheduledAt"),
  totalOpens: int("totalOpens").notNull().default(0),
  totalReplies: int("totalReplies").notNull().default(0),
}, (table) => ({
  tenantSequenceIdx: index("tenant_sequence_idx").on(table.tenantId, table.sequenceId),
  tenantPersonIdx: index("tenant_person_idx").on(table.tenantId, table.personId),
  tenantStatusIdx: index("tenant_status_idx").on(table.tenantId, table.status),
  tenantScheduledIdx: index("tenant_scheduled_idx").on(table.tenantId, table.nextEmailScheduledAt),
}));

export type EmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferSelect;
export type InsertEmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferInsert;

export const emailSequenceEvents = mysqlTable("emailSequenceEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  enrollmentId: varchar("enrollmentId", { length: 36 }).notNull(),
  stepNumber: int("stepNumber").notNull(),
  eventType: mysqlEnum("eventType", ["sent", "opened", "replied", "bounced", "unsubscribed"]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
}, (table) => ({
  enrollmentTimestampIdx: index("enrollment_timestamp_idx").on(table.enrollmentId, table.timestamp),
  enrollmentStepIdx: index("enrollment_step_idx").on(table.enrollmentId, table.stepNumber),
}));

export type EmailSequenceEvent = typeof emailSequenceEvents.$inferSelect;
export type InsertEmailSequenceEvent = typeof emailSequenceEvents.$inferInsert;

// Pipeline Automation
export const automationRules = mysqlTable("automationRules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: mysqlEnum("triggerType", [
    "email_opened",
    "email_replied",
    "no_reply_after_days",
    "meeting_held",
    "stage_entered",
    "deal_value_threshold"
  ]).notNull(),
  triggerConfig: json("triggerConfig").$type<Record<string, any>>().default({}),
  actionType: mysqlEnum("actionType", [
    "move_stage",
    "send_notification",
    "create_task",
    "enroll_sequence",
    "update_field"
  ]).notNull(),
  actionConfig: json("actionConfig").$type<Record<string, any>>().default({}),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx").on(table.tenantId, table.status),
  tenantTriggerIdx: index("tenant_trigger_idx").on(table.tenantId, table.triggerType),
}));

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = typeof automationRules.$inferInsert;

export const automationExecutions = mysqlTable("automationExecutions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  ruleId: varchar("ruleId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }),
  personId: varchar("personId", { length: 36 }),
  status: mysqlEnum("status", ["success", "failed", "skipped"]).notNull(),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  errorMessage: text("errorMessage"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
}, (table) => ({
  tenantRuleIdx: index("tenant_rule_idx").on(table.tenantId, table.ruleId),
  tenantThreadIdx: index("tenant_thread_idx").on(table.tenantId, table.threadId),
  tenantExecutedIdx: index("tenant_executed_idx").on(table.tenantId, table.executedAt),
}));

export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = typeof automationExecutions.$inferInsert;

// Tracking Events for Intent Scoring
export const trackingEvents = mysqlTable("trackingEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }),
  accountId: varchar("accountId", { length: 36 }),
  eventType: mysqlEnum("eventType", [
    "email_sent",
    "email_opened",
    "email_clicked",
    "email_replied",
    "page_view",
    "demo_request",
    "pricing_view",
    "content_download",
    "webinar_registration",
    "trial_started"
  ]).notNull(),
  eventData: json("eventData").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  tenantPersonIdx: index("tenant_person_idx").on(table.tenantId, table.personId),
  tenantAccountIdx: index("tenant_account_idx").on(table.tenantId, table.accountId),
  tenantTimestampIdx: index("tenant_timestamp_idx").on(table.tenantId, table.timestamp),
  tenantTypeIdx: index("tenant_type_idx").on(table.tenantId, table.eventType),
}));

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = typeof trackingEvents.$inferInsert;


// Team Chat System
export const channels = mysqlTable("channels", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["public", "private"]).default("public").notNull(),
  createdBy: varchar("createdBy", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  tenantNameIdx: index("tenant_name_idx").on(table.tenantId, table.name),
}));

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

export const channelMembers = mysqlTable("channelMembers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  channelId: varchar("channelId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastReadAt: timestamp("lastReadAt"),
}, (table) => ({
  channelUserIdx: unique("channel_user_unique").on(table.channelId, table.userId),
  userIdx: index("user_idx").on(table.userId),
}));

export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = typeof channelMembers.$inferInsert;

export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  channelId: varchar("channelId", { length: 36 }),
  userId: varchar("userId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  threadId: varchar("threadId", { length: 36 }), // null for top-level, references another message for replies
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 100 }),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  tenantChannelIdx: index("tenant_channel_idx").on(table.tenantId, table.channelId),
  channelCreatedIdx: index("channel_created_idx").on(table.channelId, table.createdAt),
  threadIdx: index("thread_idx").on(table.threadId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const directMessages = mysqlTable("directMessages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  senderId: varchar("senderId", { length: 36 }).notNull(),
  recipientId: varchar("recipientId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  tenantSenderRecipientIdx: index("tenant_sender_recipient_idx").on(table.tenantId, table.senderId, table.recipientId),
  tenantRecipientIdx: index("tenant_recipient_idx").on(table.tenantId, table.recipientId),
  createdIdx: index("created_idx").on(table.createdAt),
}));

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = typeof directMessages.$inferInsert;

export const messageReactions = mysqlTable("messageReactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  messageId: varchar("messageId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  messageUserEmojiIdx: unique("message_user_emoji_unique").on(table.messageId, table.userId, table.emoji),
  messageIdx: index("message_idx").on(table.messageId),
}));

export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;

export const typingIndicators = mysqlTable("typingIndicators", {
  id: varchar("id", { length: 36 }).primaryKey(),
  channelId: varchar("channelId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  lastTypingAt: timestamp("lastTypingAt").defaultNow().notNull(),
}, (table) => ({
  channelUserIdx: unique("channel_user_typing_unique").on(table.channelId, table.userId),
  channelIdx: index("channel_typing_idx").on(table.channelId),
  lastTypingIdx: index("last_typing_idx").on(table.lastTypingAt),
}));

export type TypingIndicator = typeof typingIndicators.$inferSelect;
export type InsertTypingIndicator = typeof typingIndicators.$inferInsert;

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  type: mysqlEnum("type", ["mention", "reply", "reaction"]).notNull(),
  messageId: varchar("messageId", { length: 36 }),
  channelId: varchar("channelId", { length: 36 }),
  content: text("content"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index("user_read_idx").on(table.userId, table.isRead),
  createdIdx: index("created_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const aiConversations = mysqlTable("aiConversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  messages: json("messages").notNull(), // Array of {role, content}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_conversations_idx").on(table.userId),
  tenantIdx: index("tenant_conversations_idx").on(table.tenantId),
  updatedIdx: index("updated_conversations_idx").on(table.updatedAt),
}));

export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = typeof aiConversations.$inferInsert;


// ============ EMAIL ACCOUNTS ============

export const emailAccounts = mysqlTable("emailAccounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // gmail, outlook, custom
  smtpHost: text("smtpHost"),
  smtpPort: int("smtpPort"),
  smtpUser: text("smtpUser"),
  smtpPass: text("smtpPass"), // Encrypted
  imapHost: text("imapHost"),
  imapPort: int("imapPort"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("email_accounts_tenant_idx").on(table.tenantId),
  userIdx: index("email_accounts_user_idx").on(table.userId),
}));

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

// ============ MARKETING CAMPAIGNS ============

export const marketingCampaigns = mysqlTable("marketingCampaigns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "paused"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  recipientCount: int("recipientCount").default(0).notNull(),
  openCount: int("openCount").default(0).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("campaigns_tenant_idx").on(table.tenantId),
  userIdx: index("campaigns_user_idx").on(table.userId),
  statusIdx: index("campaigns_status_idx").on(table.status),
}));

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = typeof marketingCampaigns.$inferInsert;

// ============ CAMPAIGN RECIPIENTS ============

export const campaignRecipients = mysqlTable("campaignRecipients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  campaignId: varchar("campaignId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  error: text("error"),
}, (table) => ({
  campaignIdx: index("recipients_campaign_idx").on(table.campaignId),
  personIdx: index("recipients_person_idx").on(table.personId),
}));

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = typeof campaignRecipients.$inferInsert;
