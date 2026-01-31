import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, unique } from "drizzle-orm/mysql-core";

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantEmailIdx: unique("tenant_email_unique").on(table.tenantId, table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const people = mysqlTable("people", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  fullName: text("fullName").notNull(),
  primaryEmail: varchar("primaryEmail", { length: 320 }).notNull(),
  secondaryEmails: json("secondaryEmails").$type<string[]>().default([]),
  companyName: text("companyName"),
  roleTitle: text("roleTitle"),
  phone: varchar("phone", { length: 50 }),
  tags: json("tags").$type<string[]>().default([]),
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
  provider: mysqlEnum("provider", ["google", "amplemarket"]).notNull(),
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
