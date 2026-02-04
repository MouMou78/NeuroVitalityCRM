import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  tenants, Tenant, InsertTenant,
  users, User, InsertUser,
  accounts, Account, InsertAccount,
  people, Person, InsertPerson,
  threads, Thread, InsertThread,
  moments, Moment, InsertMoment,
  nextActions, NextAction, InsertNextAction,
  events, Event, InsertEvent,
  integrations, Integration, InsertIntegration
} from "../drizzle/schema";
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ TENANTS ============

export async function createTenant(data: Omit<InsertTenant, "id">): Promise<Tenant> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(tenants).values({ id, ...data });
  
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0]!;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

// ============ USERS ============

export async function createUser(data: Omit<InsertUser, "id">): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(users).values({ id, ...data });
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0]!;
}

export async function getUserByEmail(tenantId: string, email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
    .limit(1);
  
  return result[0];
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ============ PEOPLE ============

export async function createPerson(data: Omit<InsertPerson, "id">): Promise<Person> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(people).values({ id, ...data });
  
  const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return result[0]!;
}

export async function upsertPerson(tenantId: string, primaryEmail: string, data: Partial<Omit<InsertPerson, "id" | "tenantId" | "primaryEmail">>): Promise<Person> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(people)
    .where(and(eq(people.tenantId, tenantId), eq(people.primaryEmail, primaryEmail)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(people)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(people.id, existing[0].id));
    
    const result = await db.select().from(people).where(eq(people.id, existing[0].id)).limit(1);
    return result[0]!;
  }

  return createPerson({ tenantId, primaryEmail, ...data } as Omit<InsertPerson, "id">);
}

export async function getPeopleByTenant(tenantId: string): Promise<Person[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(people).where(eq(people.tenantId, tenantId)).orderBy(desc(people.createdAt));
}

export async function getPersonById(id: string): Promise<Person | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return result[0];
}

export async function updatePerson(id: string, data: Partial<Omit<InsertPerson, "id" | "tenantId">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(people).set(data).where(eq(people.id, id));
}

// ============ THREADS ============

export async function createThread(data: Omit<InsertThread, "id">): Promise<Thread> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(threads).values({ id, ...data });
  
  const result = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
  return result[0]!;
}

export async function getThreadById(id: string): Promise<Thread | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
  return result[0];
}

export async function getThreadsByPerson(tenantId: string, personId: string): Promise<Thread[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(threads)
    .where(and(eq(threads.tenantId, tenantId), eq(threads.personId, personId)))
    .orderBy(desc(threads.lastActivityAt));
}

export async function updateThreadActivity(threadId: string, timestamp: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(threads).set({ lastActivityAt: timestamp }).where(eq(threads.id, threadId));
}

// ============ MOMENTS ============

export async function createMoment(data: Omit<InsertMoment, "id">): Promise<Moment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(moments).values({ id, ...data });
  
  // Update thread activity
  await updateThreadActivity(data.threadId, data.timestamp);
  
  const result = await db.select().from(moments).where(eq(moments.id, id)).limit(1);
  return result[0]!;
}

export async function getMomentsByThread(tenantId: string, threadId: string): Promise<Moment[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(moments)
    .where(and(eq(moments.tenantId, tenantId), eq(moments.threadId, threadId)))
    .orderBy(asc(moments.timestamp));
}

// ============ NEXT ACTIONS ============

export async function createNextAction(data: Omit<InsertNextAction, "id">): Promise<NextAction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(nextActions).values({ id, ...data });
  
  const result = await db.select().from(nextActions).where(eq(nextActions.id, id)).limit(1);
  return result[0]!;
}

export async function closeOpenActionsForThread(tenantId: string, threadId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(nextActions)
    .set({ status: "cancelled" })
    .where(and(
      eq(nextActions.tenantId, tenantId),
      eq(nextActions.threadId, threadId),
      eq(nextActions.status, "open")
    ));
}

export async function completeNextAction(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(nextActions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(nextActions.id, id));
}

export async function getOpenActionsByTenant(tenantId: string): Promise<NextAction[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(nextActions)
    .where(and(eq(nextActions.tenantId, tenantId), eq(nextActions.status, "open")))
    .orderBy(asc(nextActions.createdAt));
}

export async function getOpenActionForThread(tenantId: string, threadId: string): Promise<NextAction | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(nextActions)
    .where(and(
      eq(nextActions.tenantId, tenantId),
      eq(nextActions.threadId, threadId),
      eq(nextActions.status, "open")
    ))
    .limit(1);
  
  return result[0];
}

// ============ EVENTS ============

export async function createEvent(data: Omit<InsertEvent, "id">): Promise<Event> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(events).values({ id, ...data });
  
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0]!;
}

export async function getEventBySlug(tenantId: string, slug: string): Promise<Event | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, tenantId), eq(events.slug, slug)))
    .limit(1);
  
  return result[0];
}

export async function getEventsByTenant(tenantId: string): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(events).where(eq(events.tenantId, tenantId)).orderBy(desc(events.createdAt));
}

// ============ INTEGRATIONS ============

export async function upsertIntegration(tenantId: string, provider: "google" | "amplemarket", data: Partial<Omit<InsertIntegration, "id" | "tenantId" | "provider">>): Promise<Integration> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.tenantId, tenantId), eq(integrations.provider, provider)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(integrations)
      .set(data)
      .where(eq(integrations.id, existing[0].id));
    
    const result = await db.select().from(integrations).where(eq(integrations.id, existing[0].id)).limit(1);
    return result[0]!;
  }

  const id = nanoid();
  await db.insert(integrations).values({ id, tenantId, provider, ...data });
  
  const result = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
  return result[0]!;
}

export async function getIntegrationsByTenant(tenantId: string): Promise<Integration[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(integrations).where(eq(integrations.tenantId, tenantId));
}


export async function getThreadsByTenant(tenantId: string): Promise<Thread[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(threads).where(eq(threads.tenantId, tenantId));
}

export async function updateThread(tenantId: string, threadId: string, data: Partial<Omit<Thread, "id" | "tenantId">>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(threads).set(data).where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)));
}

export async function getMomentsByTenant(tenantId: string): Promise<Moment[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(moments).where(eq(moments.tenantId, tenantId)).orderBy(desc(moments.timestamp));
}

export async function getNextActionsByTenant(tenantId: string): Promise<NextAction[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(nextActions).where(eq(nextActions.tenantId, tenantId));
}

export async function getNextActionsByThread(tenantId: string, threadId: string): Promise<NextAction[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(nextActions)
    .where(and(eq(nextActions.tenantId, tenantId), eq(nextActions.threadId, threadId)))
    .orderBy(desc(nextActions.createdAt));
}

// ============ ACCOUNTS ============

export async function getAccountById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0] || null;
}

export async function getAccountsBySource(tenantId: string, source: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(accounts)
    .where(and(
      eq(accounts.tenantId, tenantId),
      eq(accounts.enrichmentSource, source)
    ))
    .orderBy(desc(accounts.createdAt));
}

export async function getPeopleBySource(tenantId: string, source: string): Promise<Person[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(people)
    .where(and(
      eq(people.tenantId, tenantId),
      eq(people.enrichmentSource, source)
    ))
    .orderBy(desc(people.createdAt));
}

export async function getAccountsByTenant(tenantId: string) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(accounts).where(eq(accounts.tenantId, tenantId));
}


// ============ EMAIL SEQUENCES ============

export async function createEmailSequence(tenantId: string, data: { name: string; description?: string; status?: "active" | "paused" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailSequences } = await import("../drizzle/schema");
  const id = nanoid();
  await db.insert(emailSequences).values({
    id,
    tenantId,
    name: data.name,
    description: data.description,
    status: data.status || "active",
  });

  const result = await db.select().from(emailSequences).where(eq(emailSequences.id, id)).limit(1);
  return result[0]!;
}

export async function createEmailSequenceStep(sequenceId: string, step: { stepNumber: number; subject: string; body: string; delayDays: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailSequenceSteps } = await import("../drizzle/schema");
  const id = nanoid();
  await db.insert(emailSequenceSteps).values({
    id,
    sequenceId,
    stepNumber: step.stepNumber,
    subject: step.subject,
    body: step.body,
    delayDays: step.delayDays,
  });

  const result = await db.select().from(emailSequenceSteps).where(eq(emailSequenceSteps.id, id)).limit(1);
  return result[0]!;
}

export async function getEmailSequencesByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { emailSequences } = await import("../drizzle/schema");
  return db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.tenantId, tenantId))
    .orderBy(desc(emailSequences.createdAt));
}

export async function getEmailSequenceById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const { emailSequences } = await import("../drizzle/schema");
  const result = await db.select().from(emailSequences).where(eq(emailSequences.id, id)).limit(1);
  return result[0] || null;
}

export async function getEmailSequenceSteps(sequenceId: string) {
  const db = await getDb();
  if (!db) return [];

  const { emailSequenceSteps } = await import("../drizzle/schema");
  return db
    .select()
    .from(emailSequenceSteps)
    .where(eq(emailSequenceSteps.sequenceId, sequenceId))
    .orderBy(emailSequenceSteps.stepNumber);
}

export async function getEmailSequenceEnrollments(tenantId: string, sequenceId: string) {
  const db = await getDb();
  if (!db) return [];

  const { emailSequenceEnrollments } = await import("../drizzle/schema");
  return db
    .select()
    .from(emailSequenceEnrollments)
    .where(and(
      eq(emailSequenceEnrollments.tenantId, tenantId),
      eq(emailSequenceEnrollments.sequenceId, sequenceId)
    ))
    .orderBy(desc(emailSequenceEnrollments.enrolledAt));
}

// ============ TRACKING EVENTS ============

export async function createTrackingEvent(tenantId: string, data: {
  personId?: string;
  accountId?: string;
  eventType: string;
  eventData?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { trackingEvents } = await import("../drizzle/schema");
  const id = nanoid();
  await db.insert(trackingEvents).values({
    id,
    tenantId,
    personId: data.personId,
    accountId: data.accountId,
    eventType: data.eventType as any,
    eventData: data.eventData || {},
  });

  const result = await db.select().from(trackingEvents).where(eq(trackingEvents.id, id)).limit(1);
  return result[0]!;
}

export async function getTrackingEventsByPerson(tenantId: string, personId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const { trackingEvents } = await import("../drizzle/schema");
  return db
    .select()
    .from(trackingEvents)
    .where(and(
      eq(trackingEvents.tenantId, tenantId),
      eq(trackingEvents.personId, personId)
    ))
    .orderBy(desc(trackingEvents.timestamp))
    .limit(limit);
}

export async function getTrackingEventsByAccount(tenantId: string, accountId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const { trackingEvents } = await import("../drizzle/schema");
  return db
    .select()
    .from(trackingEvents)
    .where(and(
      eq(trackingEvents.tenantId, tenantId),
      eq(trackingEvents.accountId, accountId)
    ))
    .orderBy(desc(trackingEvents.timestamp))
    .limit(limit);
}


// ============================================================================
// Chat Functions
// ============================================================================

export async function getChannelsByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { channels } = await import("../drizzle/schema");
  return db
    .select()
    .from(channels)
    .where(eq(channels.tenantId, tenantId))
    .orderBy(channels.name);
}

export async function getChannelById(channelId: string) {
  const db = await getDb();
  if (!db) return null;

  const { channels } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);
  return results[0] || null;
}

export async function createChannel(data: { id: string; tenantId: string; name: string; description?: string; type: "public" | "private"; createdBy: string }) {
  const db = await getDb();
  if (!db) return null;

  const { channels } = await import("../drizzle/schema");
  await db.insert(channels).values(data);
  return getChannelById(data.id);
}

export async function getMessagesByChannel(channelId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const { messages, users } = await import("../drizzle/schema");
  return db
    .select({
      id: messages.id,
      tenantId: messages.tenantId,
      channelId: messages.channelId,
      userId: messages.userId,
      content: messages.content,
      threadId: messages.threadId,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      deletedAt: messages.deletedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

export async function createMessage(data: { id: string; tenantId: string; channelId: string; userId: string; content: string; threadId?: string }) {
  const db = await getDb();
  if (!db) return null;

  const { messages } = await import("../drizzle/schema");
  await db.insert(messages).values(data);
  
  const results = await db
    .select()
    .from(messages)
    .where(eq(messages.id, data.id))
    .limit(1);
  return results[0] || null;
}

export async function addChannelMember(data: { id: string; channelId: string; userId: string; role: "admin" | "member" }) {
  const db = await getDb();
  if (!db) return null;

  const { channelMembers } = await import("../drizzle/schema");
  await db.insert(channelMembers).values(data);
  
  const results = await db
    .select()
    .from(channelMembers)
    .where(eq(channelMembers.id, data.id))
    .limit(1);
  return results[0] || null;
}
