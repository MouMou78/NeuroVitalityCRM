import { integer, pgTable, text, timestamp, varchar, json, index, unique, boolean, decimal, serial, real } from "drizzle-orm/pg-core";

/**
 * Multi-tenant CRM schema for KompassCRM
 * Supports tenants, users, people, threads, moments, next_actions, events, and integrations
 */

export const tenants = pgTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  domainIdx: index("domain_idx").on(table.domain),
}));

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: text("role").default("user").notNull(),
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

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }),
  industry: text("industry"),
  employees: varchar("employees", { length: 50 }),
  revenue: varchar("revenue", { length: 100 }),
  technologies: json("technologies").$type<string[]>(),
  headquarters: text("headquarters"),
  foundingYear: integer("foundingYear"),
  lastFundingRound: varchar("lastFundingRound", { length: 100 }),
  firstContacted: timestamp("firstContacted"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  enrichmentSource: text("enrichmentSource"),
  enrichmentSnapshot: json("enrichmentSnapshot").$type<Record<string, any>>(),
  
  // Amplemarket integration tracking
  integrationId: varchar("integrationId", { length: 36 }),
  amplemarketUserId: varchar("amplemarketUserId", { length: 100 }),
  amplemarketExternalId: varchar("amplemarketExternalId", { length: 100 }),
  
  // Lead Scoring Fields
  fitScore: integer("fitScore").default(0),
  intentScore: integer("intentScore").default(0),
  combinedScore: integer("combinedScore").default(0),
  fitTier: text("fitTier"),
  intentTier: text("intentTier"),
  scoreReasons: json("scoreReasons").$type<string[]>(),
  lifecycleStage: text("lifecycleStage").default("Lead"),
  lifecycleStageEnteredAt: timestamp("lifecycleStageEnteredAt"),
  ownerUserId: varchar("ownerUserId", { length: 36 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantDomainIdx: index("tenant_domain_idx").on(table.tenantId, table.domain),
  tenantNameIdx: index("tenant_account_name_idx").on(table.tenantId, table.name),
}));

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export const people = pgTable("people", {
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
  numberOfOpens: integer("numberOfOpens").default(0),
  label: varchar("label", { length: 100 }),
  meetingBooked: boolean("meetingBooked").default(false),
  owner: varchar("owner", { length: 320 }),
  sequenceName: text("sequenceName"),
  sequenceTemplateName: text("sequenceTemplateName"),
  savedSearchOrLeadListName: text("savedSearchOrLeadListName"),
  mailbox: varchar("mailbox", { length: 320 }),
  contactUrl: varchar("contactUrl", { length: 500 }),
  replied: boolean("replied").default(false),
  engagementScore: integer("engagementScore").default(0),
  lastStageExecuted: integer("lastStageExecuted"),
  lastStageExecutedAt: timestamp("lastStageExecutedAt"),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().default([]),
  
  // Lead Scoring Fields
  fitScore: integer("fitScore").default(0),
  intentScore: integer("intentScore").default(0),
  combinedScore: integer("combinedScore").default(0),
  fitTier: text("fitTier"),
  intentTier: text("intentTier"),
  scoreReasons: json("scoreReasons").$type<string[]>(),
  lifecycleStage: text("lifecycleStage").default("Lead"),
  lifecycleStageEnteredAt: timestamp("lifecycleStageEnteredAt"),
  seniority: text("seniority"),
  department: varchar("department", { length: 100 }),
  region: varchar("region", { length: 100 }),
  
  enrichmentSource: text("enrichmentSource"),
  enrichmentSnapshot: json("enrichmentSnapshot").$type<Record<string, any>>(),
  enrichmentLastSyncedAt: timestamp("enrichmentLastSyncedAt"),
  
  // Amplemarket integration tracking
  integrationId: varchar("integrationId", { length: 36 }),
  amplemarketUserId: varchar("amplemarketUserId", { length: 100 }),
  amplemarketExternalId: varchar("amplemarketExternalId", { length: 100 }),
  
  // Assignment tracking
  assignedToUserId: varchar("assignedToUserId", { length: 36 }),
  assignedAt: timestamp("assignedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantEmailIdx: unique("tenant_primary_email_unique").on(table.tenantId, table.primaryEmail),
  tenantNameIdx: index("tenant_name_idx").on(table.tenantId, table.fullName),
}));

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// Tags for categorizing people and accounts
export const tags = pgTable("tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"), // Hex color code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantNameIdx: unique("tenant_tag_name_unique").on(table.tenantId, table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// Junction table for many-to-many relationship between people and tags
export const personTags = pgTable("person_tags", {
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
export const accountTags = pgTable("account_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: varchar("accountId", { length: 36 }).notNull(),
  tagId: varchar("tagId", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  accountTagIdx: unique("account_tag_unique").on(table.accountId, table.tagId),
  accountIdx: index("account_idx").on(table.accountId),
  tagIdx: index("tag_idx_1").on(table.tagId),
}));

export type AccountTag = typeof accountTags.$inferSelect;
export type InsertAccountTag = typeof accountTags.$inferInsert;

export const threads = pgTable("threads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  source: text("source").notNull(),
  intent: text("intent").notNull(),
  status: text("status").default("active").notNull(),
  title: text("title"),
  lastActivityAt: timestamp("lastActivityAt"),
  ownerUserId: integer("ownerUserId"),
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

export const moments = pgTable("moments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  source: text("source").notNull(),
  type: text("type").notNull(),
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

export const nextActions = pgTable("nextActions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }).notNull(),
  actionType: text("actionType").notNull(),
  triggerType: text("triggerType").notNull(),
  triggerValue: text("triggerValue").notNull(),
  status: text("status").default("open").notNull(),
  assignedUserId: integer("assignedUserId"),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx_1").on(table.tenantId, table.status),
  tenantAssignedIdx: index("tenant_assigned_idx").on(table.tenantId, table.assignedUserId, table.status),
  tenantDueIdx: index("tenant_due_idx").on(table.tenantId, table.dueAt),
  tenantThreadStatusIdx: index("tenant_thread_status_idx").on(table.tenantId, table.threadId, table.status),
}));

export type NextAction = typeof nextActions.$inferSelect;
export type InsertNextAction = typeof nextActions.$inferInsert;

export const events = pgTable("events", {
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

export const integrations = pgTable("integrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  provider: text("provider").notNull(),
  status: text("status").default("disconnected").notNull(),
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
export const syncHistory = pgTable("syncHistory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  syncType: varchar("syncType", { length: 50 }).notNull(),
  status: text("status").notNull(),
  recordsSynced: integer("recordsSynced").notNull().default(0),
  conflictsResolved: integer("conflictsResolved").notNull().default(0),
  errors: json("errors").$type<any[]>(),
  config: json("config").$type<Record<string, any>>(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = typeof syncHistory.$inferInsert;

// Email Sequences
export const emailSequences = pgTable("emailSequences", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx_2").on(table.tenantId, table.status),
}));

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

export const emailSequenceSteps = pgTable("emailSequenceSteps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  stepNumber: integer("stepNumber").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayDays: integer("delayDays").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceStepIdx: index("sequence_step_idx").on(table.sequenceId, table.stepNumber),
}));

export type EmailSequenceStep = typeof emailSequenceSteps.$inferSelect;
export type InsertEmailSequenceStep = typeof emailSequenceSteps.$inferInsert;

export const emailSequenceEnrollments = pgTable("emailSequenceEnrollments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }),
  currentStep: integer("currentStep").notNull().default(0),
  status: text("status").default("active").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  nextEmailScheduledAt: timestamp("nextEmailScheduledAt"),
  totalOpens: integer("totalOpens").notNull().default(0),
  totalReplies: integer("totalReplies").notNull().default(0),
}, (table) => ({
  tenantSequenceIdx: index("tenant_sequence_idx").on(table.tenantId, table.sequenceId),
  tenantPersonIdx: index("tenant_person_idx_1").on(table.tenantId, table.personId),
  tenantStatusIdx: index("tenant_status_idx_3").on(table.tenantId, table.status),
  tenantScheduledIdx: index("tenant_scheduled_idx").on(table.tenantId, table.nextEmailScheduledAt),
}));

export type EmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferSelect;
export type InsertEmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferInsert;

export const emailSequenceEvents = pgTable("emailSequenceEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  enrollmentId: varchar("enrollmentId", { length: 36 }).notNull(),
  stepNumber: integer("stepNumber").notNull(),
  eventType: text("eventType").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
}, (table) => ({
  enrollmentTimestampIdx: index("enrollment_timestamp_idx").on(table.enrollmentId, table.timestamp),
  enrollmentStepIdx: index("enrollment_step_idx").on(table.enrollmentId, table.stepNumber),
}));

export type EmailSequenceEvent = typeof emailSequenceEvents.$inferSelect;
export type InsertEmailSequenceEvent = typeof emailSequenceEvents.$inferInsert;

// Conditional Sequence Nodes (for non-linear sequences)
export const sequenceNodes = pgTable("sequenceNodes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  nodeType: text("nodeType").notNull(),
  position: json("position").$type<{ x: number; y: number }>().notNull(), // For visual builder
  
  // Email node fields
  subject: text("subject"),
  body: text("body"),
  
  // Wait node fields
  waitDays: integer("waitDays"),
  waitUntilTime: varchar("waitUntilTime", { length: 20 }), // e.g., "09:00" for wait until 9am
  
  // Condition node fields
  conditionType: text("conditionType"),
  conditionConfig: json("conditionConfig").$type<Record<string, any>>(), // e.g., {field: "jobTitle", operator: "equals", value: "CEO"}
  
  // A/B split node fields
  variantAPercentage: integer("variantAPercentage"), // e.g., 50 for 50/50 split
  
  // Goal check node fields
  goalType: text("goalType"),
  
  label: text("label"), // Display name for the node
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceNodeIdx: index("sequence_node_idx").on(table.sequenceId),
}));

export type SequenceNode = typeof sequenceNodes.$inferSelect;
export type InsertSequenceNode = typeof sequenceNodes.$inferInsert;

// Sequence Edges (connections between nodes)
export const sequenceEdges = pgTable("sequenceEdges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sequenceId: varchar("sequenceId", { length: 36 }).notNull(),
  sourceNodeId: varchar("sourceNodeId", { length: 36 }).notNull(),
  targetNodeId: varchar("targetNodeId", { length: 36 }).notNull(),
  
  // Edge condition (for branching)
  edgeType: text("edgeType").notNull().default("default"),
  label: text("label"), // e.g., "If replied", "If not opened", "Variant A"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sequenceEdgeIdx: index("sequence_edge_idx").on(table.sequenceId),
  sourceNodeIdx: index("source_node_idx").on(table.sourceNodeId),
}));

export type SequenceEdge = typeof sequenceEdges.$inferSelect;
export type InsertSequenceEdge = typeof sequenceEdges.$inferInsert;

// Enrollment Path Tracking (which nodes each prospect visited)
export const enrollmentPathHistory = pgTable("enrollmentPathHistory", {
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
export const automationRules = pgTable("automationRules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("triggerType").notNull(),
  triggerConfig: json("triggerConfig").$type<Record<string, any>>().default({}),
  actionType: text("actionType").notNull(),
  actionConfig: json("actionConfig").$type<Record<string, any>>().default({}),
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: integer("priority").default(0).notNull(),
  schedule: text("schedule"),
  timezone: text("timezone").default("UTC"),
  nextRunAt: timestamp("nextRunAt"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantStatusIdx: index("tenant_status_idx_4").on(table.tenantId, table.status),
  tenantTriggerIdx: index("tenant_trigger_idx").on(table.tenantId, table.triggerType),
}));

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = typeof automationRules.$inferInsert;

export const automationExecutions = pgTable("automationExecutions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  ruleId: varchar("ruleId", { length: 36 }).notNull(),
  threadId: varchar("threadId", { length: 36 }),
  personId: varchar("personId", { length: 36 }),
  status: text("status").notNull(),
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
export const templateReviews = pgTable("templateReviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 100 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx").on(table.templateId),
  userIdx: index("user_idx").on(table.userId),
}));

export type TemplateReview = typeof templateReviews.$inferSelect;
export type InsertTemplateReview = typeof templateReviews.$inferInsert;

// Template Analytics
export const templateAnalytics = pgTable("templateAnalytics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 100 }).notNull().unique(),
  installCount: integer("installCount").default(0).notNull(),
  successCount: integer("successCount").default(0).notNull(),
  failureCount: integer("failureCount").default(0).notNull(),
  lastInstalledAt: timestamp("lastInstalledAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx_1").on(table.templateId),
}));

export type TemplateAnalytics = typeof templateAnalytics.$inferSelect;
export type InsertTemplateAnalytics = typeof templateAnalytics.$inferInsert;

// User Templates
export const userTemplates = pgTable("userTemplates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  triggerType: text("triggerType").notNull(),
  triggerConfig: json("triggerConfig").$type<Record<string, any>>().default({}),
  actionType: text("actionType").notNull(),
  actionConfig: json("actionConfig").$type<Record<string, any>>().default({}),
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: integer("priority").default(0).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  baseTemplateId: varchar("baseTemplateId", { length: 100 }),
  version: integer("version").default(1).notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx_1").on(table.userId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  publicIdx: index("public_idx").on(table.isPublic),
}));

export type UserTemplate = typeof userTemplates.$inferSelect;
export type InsertUserTemplate = typeof userTemplates.$inferInsert;

// Template Version History
export const templateVersions = pgTable("templateVersions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("templateId", { length: 36 }).notNull(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  triggerType: text("triggerType").notNull(),
  triggerConfig: json("triggerConfig").$type<Record<string, any>>().default({}),
  actionType: text("actionType").notNull(),
  actionConfig: json("actionConfig").$type<Record<string, any>>().default({}),
  conditions: json("conditions").$type<{
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  }>().default({ logic: 'AND', rules: [] }),
  priority: integer("priority").default(0).notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("template_idx_2").on(table.templateId),
  versionIdx: index("version_idx").on(table.version),
}));

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = typeof templateVersions.$inferInsert;

// Tracking Events for Intent Scoring
export const trackingEvents = pgTable("trackingEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }),
  accountId: varchar("accountId", { length: 36 }),
  eventType: text("eventType").notNull(),
  eventData: json("eventData").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  tenantPersonIdx: index("tenant_person_idx_2").on(table.tenantId, table.personId),
  tenantAccountIdx: index("tenant_account_idx").on(table.tenantId, table.accountId),
  tenantTimestampIdx: index("tenant_timestamp_idx").on(table.tenantId, table.timestamp),
  tenantTypeIdx: index("tenant_type_idx").on(table.tenantId, table.eventType),
}));

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = typeof trackingEvents.$inferInsert;


// Team Chat System
export const channels = pgTable("channels", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: text("type").default("public").notNull(),
  createdBy: varchar("createdBy", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, (table) => ({
  tenantIdx: index("tenant_idx_1").on(table.tenantId),
  tenantNameIdx: index("tenant_name_idx_1").on(table.tenantId, table.name),
}));

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

export const channelMembers = pgTable("channelMembers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  channelId: varchar("channelId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastReadAt: timestamp("lastReadAt"),
}, (table) => ({
  channelUserIdx: unique("channel_user_unique").on(table.channelId, table.userId),
  userIdx: index("user_idx_2").on(table.userId),
}));

export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = typeof channelMembers.$inferInsert;

export const messages = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  channelId: varchar("channelId", { length: 36 }),
  userId: varchar("userId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  threadId: varchar("threadId", { length: 36 }), // null for top-level, references another message for replies
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 100 }),
  fileSize: integer("fileSize"),
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

export const directMessages = pgTable("directMessages", {
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

export const messageReactions = pgTable("messageReactions", {
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

export const typingIndicators = pgTable("typingIndicators", {
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

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  type: text("type").notNull(),
  messageId: varchar("messageId", { length: 36 }),
  channelId: varchar("channelId", { length: 36 }),
  content: text("content"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index("user_read_idx").on(table.userId, table.isRead),
  createdIdx: index("created_idx_1").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const aiConversations = pgTable("aiConversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  messages: json("messages").notNull(), // Array of {role, content}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_conversations_idx").on(table.userId),
  tenantIdx: index("tenant_conversations_idx").on(table.tenantId),
  updatedIdx: index("updated_conversations_idx").on(table.updatedAt),
}));

export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = typeof aiConversations.$inferInsert;


// ============ EMAIL ACCOUNTS ============

export const emailAccounts = pgTable("emailAccounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // gmail, outlook, custom
  smtpHost: text("smtpHost"),
  smtpPort: integer("smtpPort"),
  smtpUser: text("smtpUser"),
  smtpPass: text("smtpPass"), // Encrypted
  imapHost: text("imapHost"),
  imapPort: integer("imapPort"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("email_accounts_tenant_idx").on(table.tenantId),
  userIdx: index("email_accounts_user_idx").on(table.userId),
}));

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

// ============ MARKETING CAMPAIGNS ============

export const marketingCampaigns = pgTable("marketingCampaigns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  recipientCount: integer("recipientCount").default(0).notNull(),
  openCount: integer("openCount").default(0).notNull(),
  clickCount: integer("clickCount").default(0).notNull(),
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

export const campaignRecipients = pgTable("campaignRecipients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  campaignId: varchar("campaignId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: text("status").default("pending").notNull(),
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

export const dealStages = pgTable("dealStages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  order: integer("order").notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("deal_stages_tenant_idx").on(table.tenantId),
  tenantOrderIdx: index("deal_stages_tenant_order_idx").on(table.tenantId, table.order),
}));

export type DealStage = typeof dealStages.$inferSelect;
export type InsertDealStage = typeof dealStages.$inferInsert;

// ============ DEALS ============

export const deals = pgTable("deals", {
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
  probability: integer("probability").default(50),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("deals_tenant_idx").on(table.tenantId),
  stageIdx: index("deals_stage_idx").on(table.stageId),
  accountIdx: index("deals_account_idx").on(table.accountId),
  ownerIdx: index("deals_owner_idx").on(table.ownerUserId),
}));

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;


// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull(),
  priority: text("priority").default("medium").notNull(),
  dueDate: timestamp("dueDate"),
  assignedToId: varchar("assignedToId", { length: 36 }),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  // Link to entities
  linkedEntityType: text("linkedEntityType"),
  linkedEntityId: varchar("linkedEntityId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const emailTemplates = pgTable("emailTemplates", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("email_templates_tenant_idx").on(table.tenantId),
  categoryIdx: index("email_templates_category_idx").on(table.category),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;


// Lead Scoring
export const leadScores = pgTable("leadScores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }).notNull(),
  // Score components
  engagementScore: integer("engagementScore").default(0).notNull(),
  demographicScore: integer("demographicScore").default(0).notNull(),
  behaviorScore: integer("behaviorScore").default(0).notNull(),
  totalScore: integer("totalScore").default(0).notNull(),
  // Score factors
  emailOpens: integer("emailOpens").default(0).notNull(),
  emailClicks: integer("emailClicks").default(0).notNull(),
  emailReplies: integer("emailReplies").default(0).notNull(),
  websiteVisits: integer("websiteVisits").default(0).notNull(),
  formSubmissions: integer("formSubmissions").default(0).notNull(),
  // Metadata
  lastActivityAt: timestamp("lastActivityAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("lead_scores_tenant_idx").on(table.tenantId),
  personIdx: index("lead_scores_person_idx").on(table.personId),
  scoreIdx: index("lead_scores_total_idx").on(table.totalScore),
}));

export type LeadScore = typeof leadScores.$inferSelect;
export type InsertLeadScore = typeof leadScores.$inferInsert;

export const leadScoringRules = pgTable("leadScoringRules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  // Rule definition
  eventType: varchar("eventType", { length: 100 }).notNull(), // email_open, email_click, etc.
  points: integer("points").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("lead_scoring_rules_tenant_idx").on(table.tenantId),
  categoryIdx: index("lead_scoring_rules_category_idx").on(table.category),
}));

export type LeadScoringRule = typeof leadScoringRules.$inferSelect;
export type InsertLeadScoringRule = typeof leadScoringRules.$inferInsert;


// Activity Feed
export const activityFeed = pgTable("activityFeed", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(), // Who performed the action
  actionType: text("actionType").notNull(),
  entityType: text("entityType"),
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
export const sharedViews = pgTable("sharedViews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  viewType: text("viewType").notNull(),
  filters: json("filters").$type<Record<string, any>>().default({}),
  sortBy: varchar("sortBy", { length: 100 }),
  sortOrder: text("sortOrder").default("asc"),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // If true, visible to all team members
  sharedWithUserIds: json("sharedWithUserIds").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("shared_views_tenant_idx").on(table.tenantId),
  creatorIdx: index("shared_views_creator_idx").on(table.createdById),
  typeIdx: index("shared_views_type_idx").on(table.viewType),
}));

export type SharedView = typeof sharedViews.$inferSelect;
export type InsertSharedView = typeof sharedViews.$inferInsert;

// Notes with full audit trail
export const notes = pgTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  content: text("content").notNull(),
  entityType: text("entityType").notNull(),
  entityId: varchar("entityId", { length: 36 }).notNull(),
  createdBy: varchar("createdBy", { length: 36 }).notNull(), // userId
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  updatedBy: varchar("updatedBy", { length: 36 }),
  updatedByName: varchar("updatedByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("notes_tenant_idx").on(table.tenantId),
  entityIdx: index("notes_entity_idx").on(table.entityType, table.entityId),
  createdByIdx: index("notes_created_by_idx").on(table.createdBy),
  createdAtIdx: index("notes_created_at_idx").on(table.createdAt),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Calendar Integration
export const calendarIntegrations = pgTable("calendarIntegrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  provider: text("provider").notNull(),
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken"), // Encrypted
  expiresAt: timestamp("expiresAt"),
  calendarId: varchar("calendarId", { length: 255 }), // External calendar ID
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("calendar_integrations_tenant_idx").on(table.tenantId),
  userIdx: index("calendar_integrations_user_idx").on(table.userId),
}));

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = typeof calendarIntegrations.$inferInsert;

export const calendarEvents = pgTable("calendarEvents", {
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
  status: text("status").default("confirmed").notNull(),
  // Link to CRM entities
  linkedContactId: varchar("linkedContactId", { length: 36 }),
  linkedAccountId: varchar("linkedAccountId", { length: 36 }),
  linkedDealId: varchar("linkedDealId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: integer("fileSize"), // bytes
  version: integer("version").default(1).notNull(),
  // Link to CRM entities
  linkedEntityType: text("linkedEntityType"),
  linkedEntityId: varchar("linkedEntityId", { length: 36 }),
  // Folder organization
  folderId: varchar("folderId", { length: 36 }),
  // Metadata
  uploadedById: varchar("uploadedById", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("documents_tenant_idx").on(table.tenantId),
  entityIdx: index("documents_entity_idx").on(table.linkedEntityType, table.linkedEntityId),
  folderIdx: index("documents_folder_idx").on(table.folderId),
  uploaderIdx: index("documents_uploader_idx").on(table.uploadedById),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const documentVersions = pgTable("documentVersions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  documentId: varchar("documentId", { length: 36 }).notNull(),
  version: integer("version").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: integer("fileSize"),
  uploadedById: varchar("uploadedById", { length: 36 }).notNull(),
  changeNote: text("changeNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  documentIdx: index("document_versions_document_idx").on(table.documentId),
  versionIdx: index("document_versions_version_idx").on(table.documentId, table.version),
}));

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

export const documentFolders = pgTable("documentFolders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentFolderId: varchar("parentFolderId", { length: 36 }),
  createdById: varchar("createdById", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("document_folders_tenant_idx").on(table.tenantId),
  parentIdx: index("document_folders_parent_idx").on(table.parentFolderId),
}));

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = typeof documentFolders.$inferInsert;

// Email Examples for AI Learning
export const emailExamples = pgTable("emailExamples", {
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
export const emailTrackingEvents = pgTable("emailTrackingEvents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  emailId: varchar("emailId", { length: 36 }).notNull(), // References sent email
  personId: varchar("personId", { length: 36 }), // Recipient
  eventType: text("eventType").notNull(),
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
export const activities = pgTable("activities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  personId: varchar("personId", { length: 36 }),
  accountId: varchar("accountId", { length: 36 }),
  userId: varchar("userId", { length: 36 }), // Who performed the activity
  activityType: text("activityType").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  metadata: json("metadata"), // Type-specific data
  externalSource: varchar("externalSource", { length: 100 }), // e.g., amplemarket, google, manual
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
export const webhookEvents = pgTable("webhookEvents", {
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
export const amplemarketListCache = pgTable("amplemarketListCache", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  listId: varchar("listId", { length: 100 }).notNull(), // Amplemarket list ID
  listName: varchar("listName", { length: 500 }).notNull(),
  owner: varchar("owner", { length: 320 }), // Owner email
  shared: boolean("shared").default(false),
  contactCount: integer("contactCount").notNull(),
  lastFetchedAt: timestamp("lastFetchedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantListIdx: unique("tenant_list_unique").on(table.tenantId, table.listId),
  tenantIdx: index("amplemarket_list_cache_tenant_idx").on(table.tenantId),
}));

export type AmplemarketListCache = typeof amplemarketListCache.$inferSelect;
export type InsertAmplemarketListCache = typeof amplemarketListCache.$inferInsert;

// Amplemarket Sync Logs (for sync status tracking)
export const amplemarketSyncLogs = pgTable("amplemarketSyncLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  syncType: text("syncType").notNull(),
  status: text("status").default("pending").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  contactsCreated: integer("contactsCreated").default(0),
  contactsUpdated: integer("contactsUpdated").default(0),
  contactsMerged: integer("contactsMerged").default(0),
  contactsSkipped: integer("contactsSkipped").default(0),
  contactsFetched: integer("contactsFetched").default(0),
  contactsKept: integer("contactsKept").default(0),
  contactsDiscarded: integer("contactsDiscarded").default(0),
  missingOwnerField: integer("missingOwnerField").default(0),
  conflictsDetected: integer("conflictsDetected").default(0),
  
  // New diagnostic counters
  correlationId: varchar("correlationId", { length: 36 }),
  listIdsScannedCount: integer("listIdsScannedCount").default(0),
  leadIdsFetchedTotal: integer("leadIdsFetchedTotal").default(0),
  leadIdsDedupedTotal: integer("leadIdsDedupedTotal").default(0),
  contactsHydratedTotal: integer("contactsHydratedTotal").default(0),
  contactsWithOwnerFieldCount: integer("contactsWithOwnerFieldCount").default(0),
  keptOwnerMatch: integer("keptOwnerMatch").default(0),
  discardedOwnerMismatch: integer("discardedOwnerMismatch").default(0),
  created: integer("created").default(0),
  updated: integer("updated").default(0),
  skipped: integer("skipped").default(0),
  reason: varchar("reason", { length: 100 }),
  
  errors: json("errors").$type<string[]>(),
  errorMessage: text("errorMessage"),
  diagnosticMessage: text("diagnosticMessage"),
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

/**
 * Leads table - Canonical entity for Amplemarket list leads
 * Separate from Contacts to reflect Amplemarket API reality
 */
export const leads = pgTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Source attribution
  source: varchar("source", { length: 50 }).notNull(), // 'amplemarket'
  sourceType: varchar("sourceType", { length: 50 }).notNull(), // 'lead'
  amplemarketLeadId: varchar("amplemarketLeadId", { length: 255 }),
  
  // Owner info
  ownerEmail: varchar("ownerEmail", { length: 320 }),
  
  // Lead data
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  company: varchar("company", { length: 255 }),
  title: varchar("title", { length: 255 }),
  
  // Optional fields
  linkedinUrl: text("linkedinUrl"),
  listIds: json("listIds").$type<string[]>(),
  sequenceIds: json("sequenceIds").$type<string[]>(),
  
  // Metadata
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx_2").on(table.tenantId),
  emailIdx: index("email_idx").on(table.email),
  ownerEmailIdx: index("owner_email_idx").on(table.ownerEmail),
  amplemarketLeadIdIdx: unique("amplemarket_lead_id_unique").on(table.tenantId, table.amplemarketLeadId),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Demo Bookings - for SDRs to book demos with sales managers
export const demoBookings = pgTable("demo_bookings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  salesManagerId: varchar("salesManagerId", { length: 36 }).notNull(), // Sales manager who the demo is booked with
  bookedByUserId: varchar("bookedByUserId", { length: 36 }).notNull(), // SDR who booked the demo
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  meetLink: varchar("meetLink", { length: 500 }).notNull(), // Google Meet link
  status: text("status").default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantManagerIdx: index("demo_tenant_manager_idx").on(table.tenantId, table.salesManagerId),
  startTimeIdx: index("demo_start_time_idx").on(table.startTime),
}));

export type DemoBooking = typeof demoBookings.$inferSelect;
export type InsertDemoBooking = typeof demoBookings.$inferInsert;

// ============ AI PERSISTENT MEMORY ============
// Stores facts, preferences, and learnings the AI accumulates over time
export const aiMemory = pgTable("aiMemory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  // Optional: memory scoped to a specific user (null = tenant-wide shared memory)
  userId: varchar("userId", { length: 36 }),
  // Category of memory for retrieval filtering
  // 'contact_insight' | 'deal_insight' | 'team_preference' | 'business_context'
  // | 'follow_up_pattern' | 'user_preference' | 'key_decision' | 'general'
  category: varchar("category", { length: 50 }).notNull(),
  // The memory content — a concise factual statement
  content: text("content").notNull(),
  // Optional entity link
  entityType: varchar("entityType", { length: 50 }), // 'contact' | 'deal' | 'account' | 'user'
  entityId: varchar("entityId", { length: 36 }),
  entityName: varchar("entityName", { length: 255 }),
  // Importance score 1-10 (higher = recalled more prominently)
  importance: integer("importance").default(5).notNull(),
  // How many times this memory has been referenced (reinforcement)
  reinforceCount: integer("reinforceCount").default(1).notNull(),
  // Source of the memory: 'ai_extracted' | 'user_stated' | 'system_observed'
  source: varchar("source", { length: 50 }).default("ai_extracted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("ai_memory_tenant_idx").on(table.tenantId),
  categoryIdx: index("ai_memory_category_idx").on(table.tenantId, table.category),
  entityIdx: index("ai_memory_entity_idx").on(table.entityType, table.entityId),
  userIdx: index("ai_memory_user_idx").on(table.userId),
}));
export type AIMemory = typeof aiMemory.$inferSelect;
export type InsertAIMemory = typeof aiMemory.$inferInsert;

// ============ KNOWLEDGE VAULT ============
// Stores uploaded files, URLs, and other knowledge sources ingested into AI memory
export const knowledgeVault = pgTable("knowledgeVault", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  uploadedByUserId: varchar("uploadedByUserId", { length: 36 }).notNull(),
  sourceType: varchar("sourceType", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  sourceUrl: text("sourceUrl"),
  storageKey: text("storageKey"),
  fileName: varchar("fileName", { length: 500 }),
  fileSize: integer("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags"),
  extractedContent: text("extractedContent"),
  aiSummary: text("aiSummary"),
  extractedMemories: text("extractedMemories"),
  status: varchar("status", { length: 50 }).default("processing").notNull(),
  processingError: text("processingError"),
  memoryInjected: boolean("memoryInjected").default(false).notNull(),
  linkedEntityType: varchar("linkedEntityType", { length: 50 }),
  linkedEntityId: varchar("linkedEntityId", { length: 36 }),
  linkedEntityName: varchar("linkedEntityName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  kvTenantIdx: index("kv_tenant_idx").on(table.tenantId),
  kvCategoryIdx: index("kv_category_idx").on(table.tenantId, table.category),
  kvStatusIdx: index("kv_status_idx").on(table.tenantId, table.status),
}));
export type KnowledgeVault = typeof knowledgeVault.$inferSelect;
export type InsertKnowledgeVault = typeof knowledgeVault.$inferInsert;

// ============ DEAL INTELLIGENCE ALERTS ============
// Proactive AI-generated alerts for deal drift, momentum, and risk patterns
export const dealIntelligenceAlerts = pgTable("dealIntelligenceAlerts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  dealId: varchar("dealId", { length: 36 }).notNull(),
  dealName: varchar("dealName", { length: 500 }).notNull(),
  alertType: varchar("alertType", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  message: text("message").notNull(),
  recommendation: text("recommendation"),
  confidence: integer("confidence").default(70).notNull(),
  patternData: text("patternData"),
  isRead: boolean("isRead").default(false).notNull(),
  isDismissed: boolean("isDismissed").default(false).notNull(),
  actionTaken: boolean("actionTaken").default(false).notNull(),
  actionNote: text("actionNote"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  diaTenantIdx: index("dia_tenant_idx").on(table.tenantId),
  diaDealIdx: index("dia_deal_idx").on(table.dealId),
  diaUnreadIdx: index("dia_unread_idx").on(table.tenantId, table.isRead, table.isDismissed),
}));
export type DealIntelligenceAlert = typeof dealIntelligenceAlerts.$inferSelect;
export type InsertDealIntelligenceAlert = typeof dealIntelligenceAlerts.$inferInsert;

// ============ MEETING CO-PILOT ============
// Stores meeting sessions initiated via the AI co-pilot feature
export const meetingSessions = pgTable("meetingSessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  dealId: varchar("dealId", { length: 36 }),
  personId: varchar("personId", { length: 36 }),
  accountId: varchar("accountId", { length: 36 }),
  initiatedByUserId: varchar("initiatedByUserId", { length: 36 }).notNull(),
  title: text("title"),
  meetingUrl: text("meetingUrl").notNull(),
  platform: varchar("platform", { length: 50 }).default("google_meet").notNull(),
  recallBotId: text("recallBotId"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  durationSeconds: integer("durationSeconds"),
  summaryMarkdown: text("summaryMarkdown"),
  actionItems: json("actionItems").$type<string[]>(),
  dealStageRecommendation: text("dealStageRecommendation"),
  sentimentScore: real("sentimentScore"),
  talkRatio: json("talkRatio").$type<Record<string, number>>(),
  keyTopics: json("keyTopics").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  msSessionTenantIdx: index("ms_session_tenant_idx").on(table.tenantId),
  msSessionDealIdx: index("ms_session_deal_idx").on(table.dealId),
}));
export type MeetingSession = typeof meetingSessions.$inferSelect;
export type InsertMeetingSession = typeof meetingSessions.$inferInsert;

// Stores real-time transcript utterances for each meeting session
export const meetingTranscripts = pgTable("meetingTranscripts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  speaker: text("speaker"),
  speakerType: varchar("speakerType", { length: 20 }).default("unknown"),
  text: text("text").notNull(),
  confidence: real("confidence"),
  startMs: integer("startMs"),
  endMs: integer("endMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  mtTranscriptSessionIdx: index("mt_transcript_session_idx").on(table.sessionId),
}));
export type MeetingTranscript = typeof meetingTranscripts.$inferSelect;
export type InsertMeetingTranscript = typeof meetingTranscripts.$inferInsert;

// Stores real-time AI co-pilot suggestions generated during a meeting
export const meetingCopilotSuggestions = pgTable("meetingCopilotSuggestions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  triggerText: text("triggerText"),
  confidence: real("confidence"),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  mcsSuggestionSessionIdx: index("mcs_suggestion_session_idx").on(table.sessionId),
}));
export type MeetingCopilotSuggestion = typeof meetingCopilotSuggestions.$inferSelect;
export type InsertMeetingCopilotSuggestion = typeof meetingCopilotSuggestions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// In-app notifications
// ─────────────────────────────────────────────────────────────────────────────
export const dealNotifications = pgTable("dealNotifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: text("severity").default("medium"),
  entityType: text("entityType"),
  entityId: varchar("entityId", { length: 36 }),
  entityName: text("entityName"),
  actionUrl: text("actionUrl"),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  notifTenantUserIdx: index("notif_tenant_user_idx").on(table.tenantId, table.userId),
  notifUnreadIdx: index("notif_unread_idx").on(table.tenantId, table.userId, table.read),
}));
export type DealNotification = typeof dealNotifications.$inferSelect;
export type InsertDealNotification = typeof dealNotifications.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Event Ingestion
// ─────────────────────────────────────────────────────────────────────────────
export const crmEvents = pgTable("crmEvents", {
  event_id: varchar("event_id", { length: 36 }).primaryKey(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  event_type: text("event_type").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: varchar("entity_id", { length: 36 }).notNull(),
  source: text("source").notNull(),
  occurred_at: timestamp("occurred_at").notNull(),
  received_at: timestamp("received_at").defaultNow().notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  dedupe_key: text("dedupe_key").notNull(),
  processed: boolean("processed").default(false).notNull(),
}, (table) => ({
  crmEventsTenantIdx: index("crm_events_tenant_idx").on(table.tenant_id),
  crmEventsEntityIdx: index("crm_events_entity_idx").on(table.entity_id, table.event_type),
  crmEventsOccurredIdx: index("crm_events_occurred_idx").on(table.occurred_at),
  crmEventsDedupeIdx: unique("crm_events_dedupe_unique").on(table.dedupe_key),
}));
export type CrmEventRow = typeof crmEvents.$inferSelect;
export type InsertCrmEventRow = typeof crmEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Engine Lead Scores (separate from existing leadScores)
// ─────────────────────────────────────────────────────────────────────────────
export const engineLeadScores = pgTable("engineLeadScores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  entity_id: varchar("entity_id", { length: 36 }).notNull(),
  score: integer("score").default(0).notNull(),
  tier: text("tier").default("cold").notNull(),
  last_activity_at: timestamp("last_activity_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  engineLeadScoresTenantEntityIdx: index("engine_lead_scores_tenant_entity_idx").on(table.tenant_id, table.entity_id),
}));
export type EngineLeadScore = typeof engineLeadScores.$inferSelect;
export type InsertEngineLeadScore = typeof engineLeadScores.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Suppression List
// ─────────────────────────────────────────────────────────────────────────────
export const suppressionList = pgTable("suppressionList", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  email: text("email").notNull(),
  reason: text("reason").notNull(),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  suppressionTenantEmailIdx: index("suppression_tenant_email_idx").on(table.tenant_id, table.email),
}));
export type SuppressionEntry = typeof suppressionList.$inferSelect;
export type InsertSuppressionEntry = typeof suppressionList.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Workflow Definitions
// ─────────────────────────────────────────────────────────────────────────────
export const workflowDefinitions = pgTable("workflowDefinitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workflow_id: varchar("workflow_id", { length: 36 }).notNull(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  version: integer("version").default(1).notNull(),
  status: text("status").default("draft").notNull(),
  definition: json("definition").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workflowDefTenantIdx: index("workflow_def_tenant_idx").on(table.tenant_id),
  workflowDefWorkflowIdx: index("workflow_def_workflow_idx").on(table.workflow_id),
}));
export type WorkflowDefinitionRow = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinitionRow = typeof workflowDefinitions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Workflow Enrollments
// ─────────────────────────────────────────────────────────────────────────────
export const workflowEnrollments = pgTable("workflowEnrollments", {
  enrollment_id: varchar("enrollment_id", { length: 36 }).primaryKey(),
  workflow_id: varchar("workflow_id", { length: 36 }).notNull(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  entity_id: varchar("entity_id", { length: 36 }).notNull(),
  current_node_id: varchar("current_node_id", { length: 36 }).notNull(),
  status: text("status").default("active").notNull(),
  outcome: text("outcome"),
  entered_at: timestamp("entered_at").defaultNow().notNull(),
  last_transition_at: timestamp("last_transition_at").defaultNow().notNull(),
  next_check_at: timestamp("next_check_at"),
  state_snapshot: json("state_snapshot").$type<Record<string, any>>(),
}, (table) => ({
  enrollmentTenantEntityIdx: index("enrollment_tenant_entity_idx").on(table.tenant_id, table.entity_id),
  enrollmentStatusIdx: index("enrollment_status_idx").on(table.status, table.next_check_at),
}));
export type WorkflowEnrollment = typeof workflowEnrollments.$inferSelect;
export type InsertWorkflowEnrollment = typeof workflowEnrollments.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing Engine — Nurture Enrollments
// ─────────────────────────────────────────────────────────────────────────────
export const nurtureEnrollments = pgTable("nurtureEnrollments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenant_id: varchar("tenant_id", { length: 36 }).notNull(),
  entity_id: varchar("entity_id", { length: 36 }).notNull(),
  nurture_workflow_id: varchar("nurture_workflow_id", { length: 36 }).notNull(),
  status: text("status").default("active").notNull(),
  next_send_at: timestamp("next_send_at"),
  content_index: integer("content_index").default(0).notNull(),
  enrolled_at: timestamp("enrolled_at").defaultNow().notNull(),
  last_activity_at: timestamp("last_activity_at"),
}, (table) => ({
  nurtureEnrollmentTenantEntityIdx: index("nurture_enrollment_tenant_entity_idx").on(table.tenant_id, table.entity_id),
}));
export type NurtureEnrollment = typeof nurtureEnrollments.$inferSelect;
export type InsertNurtureEnrollment = typeof nurtureEnrollments.$inferInsert;
