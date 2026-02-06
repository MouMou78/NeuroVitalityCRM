import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, unique, boolean, decimal } from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["owner", "collaborator", "restricted", "admin", "user"]).default("user").notNull(),
  twoFactorSecret: text("twoFactorSecret"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  backupCodes: json("backupCodes").$type<string[]>(),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpires: timestamp("passwordResetExpires"),
  disabled: boolean("disabled").default(false).notNull(),
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
  buyingRole: varchar("buyingRole", { length: 50 }), // Decision Maker, Champion, Influencer, User, Blocker
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
  
  // Assignment tracking
  assignedToUserId: varchar("assignedToUserId", { length: 36 }),
  assignedAt: timestamp("assignedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantEmailIdx: unique("tenant_primary_email_unique").on(table.tenantId, table.primaryEmail),
  tenantNameIdx: index("tenant_name_idx").on(table.tenantId, table.fullName),
}));

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// Tags for categorizing people and accounts
export const tags = mysqlTable("tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"), // Hex color code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantNameIdx: unique("tenant_tag_name_unique").on(table.tenantId, table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// Junction table for many-to-many relationship between people and tags
export const personTags = mysqlTable("person_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  personId: varchar("personId", { length: 36 }).notNull(),
  tagId: varchar("tagId", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  personTagIdx: unique("person_tag_unique").on(table.personId, table.tagId),
  personIdx: index("person_idx").on(table.personId),
  tagIdx: index("tag_idx").on(table.tagId),
}));

export type PersonTag = typeof personTags.$inferSelect;
export type InsertPersonTag = typeof personTags.$inferInsert;

// Junction table for many-to-many relationship between accounts and tags
export const accountTags = mysqlTable("account_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: varchar("accountId", { length: 36 }).notNull(),
  tagId: varchar("tagId", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  accountTagIdx: unique("account_tag_unique").on(table.accountId, table.tagId),
  accountIdx: index("account_idx").on(table.accountId),
  tagIdx: index("tag_idx").on(table.tagId),
}));

export type AccountTag = typeof accountTags.$inferSelect;
export type InsertAccountTag = typeof accountTags.$inferInsert;

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

// Sync History
export const syncHistory = mysqlTable("syncHistory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  syncType: varchar("syncType", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
  recordsSynced: int("recordsSynced").notNull().default(0),
  conflictsResolved: int("conflictsResolved").notNull().default(0),
  errors: json("errors").$type<any[]>(),
  config: json("config").$type<Record<string, any>>(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = typeof syncHistory.$inferInsert;

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

// Conditional Sequence Nodes (for non-linear sequences)
export const sequenceNodes = mysqlTable("sequenceNodes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  nodeType: mysqlEnum("nodeType", ["email", "wait", "condition", "ab_split", "goal_check", "exit"]).notNull(),
  position: json("position").$type<{ x: number; y: number }>().notNull(), // For visual builder
  
  // Email node fields
  subject: text("subject"),
  body: text("body"),
  
  // Wait node fields
  waitDays: int("waitDays"),
  waitUntilTime: varchar("waitUntilTime", { length: 20 }), // e.g., "09:00" for wait until 9am
  
  // Condition node fields
  conditionType: mysqlEnum("conditionType", [
    "replied",
    "not_replied",
    "opened",
    "not_opened",
    "clicked_link",
    "time_elapsed",
    "custom_field",
    "goal_achieved",
    "negative_response"
  ]),
  conditionConfig: json("conditionConfig").$type<Record<string, any>>(), // e.g., {field: "jobTitle", operator: "equals", value: "CEO"}
  
  // A/B split node fields
  variantAPercentage: int("variantAPercentage"), // e.g., 50 for 50/50 split
  
  // Goal check node fields
  goalType: mysqlEnum("goalType", ["meeting_booked", "demo_requested", "replied", "link_clicked", "custom"]),
  
  label: text("label"), // Display name for the node
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceNodeIdx: index("sequence_node_idx").on(table.sequenceId),
}));

export type SequenceNode = typeof sequenceNodes.$inferSelect;
export type InsertSequenceNode = typeof sequenceNodes.$inferInsert;

// Sequence Edges (connections between nodes)
export const sequenceEdges = mysqlTable("sequenceEdges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  sourceNodeId: varchar("sourceNodeId", { length: 36 }).notNull(),
  targetNodeId: varchar("targetNodeId", { length: 36 }).notNull(),
  
  // Edge condition (for branching)
  edgeType: mysqlEnum("edgeType", ["default", "yes", "no", "variant_a", "variant_b", "goal_met", "goal_not_met"]).notNull().default("default"),
  label: text("label"), // e.g., "If replied", "If not opened", "Variant A"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceEdgeIdx: index("sequence_edge_idx").on(table.sequenceId),
  sourceNodeIdx: index("source_node_idx").on(table.sourceNodeId),
}));

export type SequenceEdge = typeof sequenceEdges.$inferSelect;
export type InsertSequenceEdge = typeof sequenceEdges.$inferInsert;

// Enrollment Path Tracking (which nodes each prospect visited)
export const enrollmentPathHistory = mysqlTable("enrollmentPathHistory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  enrollmentId: varchar("enrollmentId", { length: 36 }).notNull(),
  nodeId: varchar("nodeId", { length: 36 }).notNull(),
  enteredAt: timestamp("enteredAt").defaultNow().notNull(),
  exitedAt: timestamp("exitedAt"),
  edgeTaken: varchar("edgeTaken", { length: 36 }), // Which edge was followed to next node
  metadata: json("metadata").$type<Record<string, any>>().default({}), // e.g., {variant: "A", conditionMet: true}
}, (table) => ({
  enrollmentNodeIdx: index("enrollment_node_idx").on(table.enrollmentId, table.nodeId),
  enrollmentTimeIdx: index("enrollment_time_idx").on(table.enrollmentId, table.enteredAt),
}));

export type EnrollmentPathHistory = typeof enrollmentPathHistory.$inferSelect;
export type InsertEnrollmentPathHistory = typeof enrollmentPathHistory.$inferInsert;

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
    "deal_value_threshold",
    "scheduled"
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
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: int("priority").default(0).notNull(),
  schedule: text("schedule"),
  timezone: text("timezone").default("UTC"),
  nextRunAt: timestamp("nextRunAt"),
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

// Template Reviews
export const templateReviews = mysqlTable("templateReviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 100 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  rating: int("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx").on(table.templateId),
  userIdx: index("user_idx").on(table.userId),
}));

export type TemplateReview = typeof templateReviews.$inferSelect;
export type InsertTemplateReview = typeof templateReviews.$inferInsert;

// Template Analytics
export const templateAnalytics = mysqlTable("templateAnalytics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 100 }).notNull().unique(),
  installCount: int("installCount").default(0).notNull(),
  successCount: int("successCount").default(0).notNull(),
  failureCount: int("failureCount").default(0).notNull(),
  lastInstalledAt: timestamp("lastInstalledAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx").on(table.templateId),
}));

export type TemplateAnalytics = typeof templateAnalytics.$inferSelect;
export type InsertTemplateAnalytics = typeof templateAnalytics.$inferInsert;

// User Templates
export const userTemplates = mysqlTable("userTemplates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["lead_nurturing", "deal_management", "task_automation", "notifications"]).notNull(),
  triggerType: mysqlEnum("triggerType", [
    "email_opened",
    "email_replied",
    "no_reply_after_days",
    "meeting_held",
    "stage_entered",
    "deal_value_threshold",
    "scheduled"
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
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: int("priority").default(0).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  baseTemplateId: varchar("baseTemplateId", { length: 100 }),
  version: int("version").default(1).notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  publicIdx: index("public_idx").on(table.isPublic),
}));

export type UserTemplate = typeof userTemplates.$inferSelect;
export type InsertUserTemplate = typeof userTemplates.$inferInsert;

// Template Version History
export const templateVersions = mysqlTable("templateVersions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 36 }).notNull(),
  version: int("version").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["lead_nurturing", "deal_management", "task_automation", "notifications"]).notNull(),
  triggerType: mysqlEnum("triggerType", [
    "email_opened",
    "email_replied",
    "no_reply_after_days",
    "meeting_held",
    "stage_entered",
    "deal_value_threshold",
    "scheduled"
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
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: int("priority").default(0).notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx").on(table.templateId),
  versionIdx: index("version_idx").on(table.version),
}));

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = typeof templateVersions.$inferInsert;

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

// ============ DEAL STAGES ============

export const dealStages = mysqlTable("dealStages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  order: int("order").notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("deal_stages_tenant_idx").on(table.tenantId),
  tenantOrderIdx: index("deal_stages_tenant_order_idx").on(table.tenantId, table.order),
}));

export type DealStage = typeof dealStages.$inferSelect;
export type InsertDealStage = typeof dealStages.$inferInsert;

// ============ DEALS ============

export const deals = mysqlTable("deals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  stageId: varchar("stageId", { length: 36 }).notNull(),
  accountId: varchar("accountId", { length: 36 }),
  contactId: varchar("contactId", { length: 36 }),
  ownerUserId: varchar("ownerUserId", { length: 36 }),
  expectedCloseDate: timestamp("expectedCloseDate"),
  probability: int("probability").default(50),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("deals_tenant_idx").on(table.tenantId),
  stageIdx: index("deals_stage_idx").on(table.stageId),
  accountIdx: index("deals_account_idx").on(table.accountId),
  ownerIdx: index("deals_owner_idx").on(table.ownerUserId),
}));

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;


// Tasks
export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "completed", "cancelled"]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  dueDate: timestamp("dueDate"),
  assignedToId: varchar("assignedToId", { length: 36 }),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  // Link to entities
  linkedEntityType: mysqlEnum("linkedEntityType", ["deal", "contact", "account"]),
  linkedEntityId: varchar("linkedEntityId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
  reminderAt: timestamp("reminderAt"),
  reminderSent: boolean("reminderSent").default(false).notNull(),
}, (table) => ({
  tenantIdx: index("tasks_tenant_idx").on(table.tenantId),
  assignedIdx: index("tasks_assigned_idx").on(table.assignedToId),
  dueIdx: index("tasks_due_idx").on(table.dueDate),
  linkedIdx: index("tasks_linked_idx").on(table.linkedEntityType, table.linkedEntityId),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;


// Email Templates
export const emailTemplates = mysqlTable("emailTemplates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  // Template content stored as JSON blocks
  content: json("content").$type<Array<{
    type: "text" | "image" | "button" | "divider" | "spacer";
    content?: string;
    styles?: Record<string, any>;
    url?: string;
    alt?: string;
  }>>().notNull(),
  variables: json("variables").$type<string[]>().default([]),
  category: varchar("category", { length: 100 }),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("email_templates_tenant_idx").on(table.tenantId),
  categoryIdx: index("email_templates_category_idx").on(table.category),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;


// Lead Scoring
export const leadScores = mysqlTable("leadScores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  // Score components
  engagementScore: int("engagementScore").default(0).notNull(),
  demographicScore: int("demographicScore").default(0).notNull(),
  behaviorScore: int("behaviorScore").default(0).notNull(),
  totalScore: int("totalScore").default(0).notNull(),
  // Score factors
  emailOpens: int("emailOpens").default(0).notNull(),
  emailClicks: int("emailClicks").default(0).notNull(),
  emailReplies: int("emailReplies").default(0).notNull(),
  websiteVisits: int("websiteVisits").default(0).notNull(),
  formSubmissions: int("formSubmissions").default(0).notNull(),
  // Metadata
  lastActivityAt: timestamp("lastActivityAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("lead_scores_tenant_idx").on(table.tenantId),
  personIdx: index("lead_scores_person_idx").on(table.personId),
  scoreIdx: index("lead_scores_total_idx").on(table.totalScore),
}));

export type LeadScore = typeof leadScores.$inferSelect;
export type InsertLeadScore = typeof leadScores.$inferInsert;

export const leadScoringRules = mysqlTable("leadScoringRules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["engagement", "demographic", "behavior"]).notNull(),
  // Rule definition
  eventType: varchar("eventType", { length: 100 }).notNull(), // email_open, email_click, etc.
  points: int("points").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("lead_scoring_rules_tenant_idx").on(table.tenantId),
  categoryIdx: index("lead_scoring_rules_category_idx").on(table.category),
}));

export type LeadScoringRule = typeof leadScoringRules.$inferSelect;
export type InsertLeadScoringRule = typeof leadScoringRules.$inferInsert;


// Activity Feed
export const activityFeed = mysqlTable("activityFeed", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(), // Who performed the action
  actionType: mysqlEnum("actionType", [
    "created_deal",
    "updated_deal",
    "moved_deal_stage",
    "created_contact",
    "updated_contact",
    "sent_email",
    "created_task",
    "completed_task",
    "added_note",
    "created_account",
    "updated_account"
  ]).notNull(),
  entityType: mysqlEnum("entityType", ["deal", "contact", "account", "task", "email"]),
  entityId: varchar("entityId", { length: 36 }),
  entityName: text("entityName"), // Denormalized for quick display
  description: text("description"), // Human-readable description
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("activity_tenant_idx").on(table.tenantId),
  userIdx: index("activity_user_idx").on(table.userId),
  entityIdx: index("activity_entity_idx").on(table.entityType, table.entityId),
  createdIdx: index("activity_created_idx").on(table.createdAt),
}));

export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertActivityFeedItem = typeof activityFeed.$inferInsert;

// Shared Views
export const sharedViews = mysqlTable("sharedViews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  viewType: mysqlEnum("viewType", ["deals", "contacts", "accounts", "tasks"]).notNull(),
  filters: json("filters").$type<Record<string, any>>().default({}),
  sortBy: varchar("sortBy", { length: 100 }),
  sortOrder: mysqlEnum("sortOrder", ["asc", "desc"]).default("asc"),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // If true, visible to all team members
  sharedWithUserIds: json("sharedWithUserIds").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("shared_views_tenant_idx").on(table.tenantId),
  creatorIdx: index("shared_views_creator_idx").on(table.createdById),
  typeIdx: index("shared_views_type_idx").on(table.viewType),
}));

export type SharedView = typeof sharedViews.$inferSelect;
export type InsertSharedView = typeof sharedViews.$inferInsert;

// Notes with full audit trail
export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  entityType: mysqlEnum("entityType", ["contact", "account", "deal", "task", "thread"]).notNull(),
  entityId: varchar("entityId", { length: 36 }).notNull(),
  createdBy: varchar("createdBy", { length: 36 }).notNull(), // userId
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  updatedBy: varchar("updatedBy", { length: 36 }),
  updatedByName: varchar("updatedByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantIdx: index("notes_tenant_idx").on(table.tenantId),
  entityIdx: index("notes_entity_idx").on(table.entityType, table.entityId),
  createdByIdx: index("notes_created_by_idx").on(table.createdBy),
  createdAtIdx: index("notes_created_at_idx").on(table.createdAt),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Calendar Integration
export const calendarIntegrations = mysqlTable("calendarIntegrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  provider: mysqlEnum("provider", ["google", "outlook"]).notNull(),
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken"), // Encrypted
  expiresAt: timestamp("expiresAt"),
  calendarId: varchar("calendarId", { length: 255 }), // External calendar ID
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("calendar_integrations_tenant_idx").on(table.tenantId),
  userIdx: index("calendar_integrations_user_idx").on(table.userId),
}));

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = typeof calendarIntegrations.$inferInsert;

export const calendarEvents = mysqlTable("calendarEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  integrationId: varchar("integrationId", { length: 36 }).notNull(),
  externalEventId: varchar("externalEventId", { length: 255 }).notNull(), // ID from Google/Outlook
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  location: text("location"),
  attendees: json("attendees").$type<string[]>().default([]),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  status: mysqlEnum("status", ["confirmed", "tentative", "cancelled"]).default("confirmed").notNull(),
  // Link to CRM entities
  linkedContactId: varchar("linkedContactId", { length: 36 }),
  linkedAccountId: varchar("linkedAccountId", { length: 36 }),
  linkedDealId: varchar("linkedDealId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("calendar_events_tenant_idx").on(table.tenantId),
  integrationIdx: index("calendar_events_integration_idx").on(table.integrationId),
  externalIdx: index("calendar_events_external_idx").on(table.externalEventId),
  startTimeIdx: index("calendar_events_start_idx").on(table.startTime),
  contactIdx: index("calendar_events_contact_idx").on(table.linkedContactId),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;


// Document Management
export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  version: int("version").default(1).notNull(),
  // Link to CRM entities
  linkedEntityType: mysqlEnum("linkedEntityType", ["contact", "account", "deal", "task"]),
  linkedEntityId: varchar("linkedEntityId", { length: 36 }),
  // Folder organization
  folderId: varchar("folderId", { length: 36 }),
  // Metadata
  uploadedById: varchar("uploadedById", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("documents_tenant_idx").on(table.tenantId),
  entityIdx: index("documents_entity_idx").on(table.linkedEntityType, table.linkedEntityId),
  folderIdx: index("documents_folder_idx").on(table.folderId),
  uploaderIdx: index("documents_uploader_idx").on(table.uploadedById),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const documentVersions = mysqlTable("documentVersions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  documentId: varchar("documentId", { length: 36 }).notNull(),
  version: int("version").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"),
  uploadedById: varchar("uploadedById", { length: 36 }).notNull(),
  changeNote: text("changeNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  documentIdx: index("document_versions_document_idx").on(table.documentId),
  versionIdx: index("document_versions_version_idx").on(table.documentId, table.version),
}));

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

export const documentFolders = mysqlTable("documentFolders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentFolderId: varchar("parentFolderId", { length: 36 }),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("document_folders_tenant_idx").on(table.tenantId),
  parentIdx: index("document_folders_parent_idx").on(table.parentFolderId),
}));

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = typeof documentFolders.$inferInsert;

// Email Examples for AI Learning
export const emailExamples = mysqlTable("emailExamples", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  context: text("context"), // What situation this email was for
  category: varchar("category", { length: 100 }), // e.g., "cold_outreach", "follow_up", "introduction"
  performanceMetrics: json("performanceMetrics"), // e.g., { openRate: 0.8, replyRate: 0.3 }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("email_examples_user_idx").on(table.userId),
  categoryIdx: index("email_examples_category_idx").on(table.category),
}));
export type EmailExample = typeof emailExamples.$inferSelect;
export type InsertEmailExample = typeof emailExamples.$inferInsert;


// Email Tracking Events
export const emailTrackingEvents = mysqlTable("emailTrackingEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  emailId: varchar("emailId", { length: 36 }).notNull(), // References sent email
  personId: varchar("personId", { length: 36 }), // Recipient
  eventType: mysqlEnum("eventType", ["sent", "delivered", "opened", "clicked", "bounced", "unsubscribed"]).notNull(),
  clickedUrl: text("clickedUrl"), // For click events
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_tracking_email_idx").on(table.emailId),
  personIdx: index("email_tracking_person_idx").on(table.personId),
  typeIdx: index("email_tracking_type_idx").on(table.eventType),
  timestampIdx: index("email_tracking_timestamp_idx").on(table.timestamp),
}));

export type EmailTrackingEvent = typeof emailTrackingEvents.$inferSelect;
export type InsertEmailTrackingEvent = typeof emailTrackingEvents.$inferInsert;

// Activity Timeline (unified view of all interactions)
export const activities = mysqlTable("activities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }),
  accountId: varchar("accountId", { length: 36 }),
  userId: varchar("userId", { length: 36 }), // Who performed the activity
  activityType: mysqlEnum("activityType", ["email", "call", "meeting", "note", "task", "deal_stage_change", "tag_added", "assignment_changed"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  metadata: json("metadata"), // Type-specific data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  personIdx: index("activities_person_idx").on(table.personId),
  accountIdx: index("activities_account_idx").on(table.accountId),
  typeIdx: index("activities_type_idx").on(table.activityType),
  timestampIdx: index("activities_timestamp_idx").on(table.timestamp),
}));

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

// Webhook Events (for audit and debugging)
export const webhookEvents = mysqlTable("webhookEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // amplemarket, apollo, etc.
  eventType: varchar("eventType", { length: 100 }).notNull(), // reply, sequence_stage, workflow_send_json
  payload: json("payload").notNull(), // Raw webhook payload
  headers: json("headers"), // Request headers
  processedAt: timestamp("processedAt"),
  error: text("error"), // Error message if processing failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("webhook_events_tenant_idx").on(table.tenantId),
  providerIdx: index("webhook_events_provider_idx").on(table.provider),
  createdIdx: index("webhook_events_created_idx").on(table.createdAt),
}));

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// Amplemarket List Cache (for contact counts)
export const amplemarketListCache = mysqlTable("amplemarketListCache", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  listId: varchar("listId", { length: 100 }).notNull(), // Amplemarket list ID
  listName: varchar("listName", { length: 500 }).notNull(),
  owner: varchar("owner", { length: 320 }), // Owner email
  shared: boolean("shared").default(false),
  contactCount: int("contactCount").notNull(),
  lastFetchedAt: timestamp("lastFetchedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantListIdx: unique("tenant_list_unique").on(table.tenantId, table.listId),
  tenantIdx: index("amplemarket_list_cache_tenant_idx").on(table.tenantId),
}));

export type AmplemarketListCache = typeof amplemarketListCache.$inferSelect;
export type InsertAmplemarketListCache = typeof amplemarketListCache.$inferInsert;

// Amplemarket Sync Logs (for sync status tracking)
export const amplemarketSyncLogs = mysqlTable("amplemarketSyncLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  syncType: mysqlEnum("syncType", ["full", "incremental", "preview", "list_counts"]).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  contactsCreated: int("contactsCreated").default(0),
  contactsUpdated: int("contactsUpdated").default(0),
  contactsMerged: int("contactsMerged").default(0),
  conflictsDetected: int("conflictsDetected").default(0),
  errors: json("errors").$type<string[]>(),
  errorMessage: text("errorMessage"),
  metadata: json("metadata").$type<Record<string, any>>(), // Additional sync details
  triggeredBy: varchar("triggeredBy", { length: 36 }), // User ID who triggered manual sync
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("amplemarket_sync_logs_tenant_idx").on(table.tenantId),
  statusIdx: index("amplemarket_sync_logs_status_idx").on(table.status),
  startedIdx: index("amplemarket_sync_logs_started_idx").on(table.startedAt),
}));

export type AmplemarketSyncLog = typeof amplemarketSyncLogs.$inferSelect;
export type InsertAmplemarketSyncLog = typeof amplemarketSyncLogs.$inferInsert;
