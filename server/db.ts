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
