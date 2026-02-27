import { eq, and, or, desc, asc, sql } from "drizzle-orm";
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
  integrations, Integration, InsertIntegration,
  syncHistory, SyncHistory, InsertSyncHistory,
  aiConversations,
  demoBookings, DemoBooking, InsertDemoBooking
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

export async function getUserByEmail(emailOrTenantId: string, emailParam?: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Support both signatures: (email) and (tenantId, email)
  if (emailParam) {
    // Called with (tenantId, email)
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, emailOrTenantId), eq(users.email, emailParam)))
      .limit(1);
    return result[0];
  } else {
    // Called with just (email)
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, emailOrTenantId))
      .limit(1);
    return result[0];
  }
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

export async function getPeopleByAccount(tenantId: string, accountId: string): Promise<Person[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(people)
    .where(and(eq(people.tenantId, tenantId), eq(people.accountId, accountId)))
    .orderBy(desc(people.createdAt));
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

export async function getSyncHistory(tenantId: string): Promise<SyncHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(syncHistory)
    .where(eq(syncHistory.tenantId, tenantId))
    .orderBy(desc(syncHistory.createdAt));
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

export async function createAccount(data: {
  tenantId: string;
  name: string;
  domain?: string;
  industry?: string;
  headquarters?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const id = nanoid();
  await database.insert(accounts).values({ id, ...data });
  const result = await database.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0]!;
}

export async function updateAccount(id: string, data: Partial<{
  name: string;
  domain: string;
  industry: string;
  headquarters: string;
}>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(accounts).set(data).where(eq(accounts.id, id));
  const result = await database.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0]!;
}

export async function deleteAccount(id: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.delete(accounts).where(eq(accounts.id, id));
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
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
      fileType: messages.fileType,
      fileSize: messages.fileSize,
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

export async function createMessage(data: { id: string; tenantId: string; channelId: string; userId: string; content: string; threadId?: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number }) {
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

// Direct Messages
export async function getDirectMessagesBetweenUsers(userId1: string, userId2: string, limit?: number) {
  const db = await getDb();
  if (!db) return [];

  const { directMessages, users } = await import("../drizzle/schema");
  const { or, and, eq, desc } = await import("drizzle-orm");
  
  let query = db
    .select({
      id: directMessages.id,
      senderId: directMessages.senderId,
      recipientId: directMessages.recipientId,
      content: directMessages.content,
      createdAt: directMessages.createdAt,
      readAt: directMessages.readAt,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(directMessages)
    .leftJoin(users, eq(directMessages.senderId, users.id))
    .where(
      or(
        and(eq(directMessages.senderId, userId1), eq(directMessages.recipientId, userId2)),
        and(eq(directMessages.senderId, userId2), eq(directMessages.recipientId, userId1))
      )
    )
    .orderBy(desc(directMessages.createdAt));

  if (limit) {
    query = query.limit(limit) as any;
  }

  const results = await query;
  return results.reverse(); // Oldest first
}

export async function createDirectMessage(data: {
  id: string;
  tenantId: string;
  senderId: string;
  recipientId: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const { directMessages } = await import("../drizzle/schema");
  await db.insert(directMessages).values(data);
  
  const results = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.id, data.id))
    .limit(1);
  return results[0] || null;
}

export async function getDirectMessageConversations(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const { directMessages, users } = await import("../drizzle/schema");
  const { or, eq, desc, sql } = await import("drizzle-orm");
  
  // Get unique conversations with last message
  const results = await db
    .select({
      otherUserId: sql<string>`CASE 
        WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.recipientId}
        ELSE ${directMessages.senderId}
      END`,
      lastMessage: directMessages.content,
      lastMessageAt: directMessages.createdAt,
      unreadCount: sql<number>`0`, // TODO: Implement unread tracking
    })
    .from(directMessages)
    .where(
      or(
        eq(directMessages.senderId, userId),
        eq(directMessages.recipientId, userId)
      )
    )
    .orderBy(desc(directMessages.createdAt))
    .limit(50);

  // Get unique conversations
  const uniqueConversations = new Map();
  for (const result of results) {
    if (!uniqueConversations.has(result.otherUserId)) {
      uniqueConversations.set(result.otherUserId, result);
    }
  }

  return Array.from(uniqueConversations.values());
}

// Message Reactions
export async function addReaction(data: { id: string; messageId: string; userId: string; emoji: string }) {
  const db = await getDb();
  if (!db) return null;

  const { messageReactions } = await import("../drizzle/schema");
  try {
    await db.insert(messageReactions).values(data);
    const results = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.id, data.id))
      .limit(1);
    return results[0] || null;
  } catch (error) {
    // Handle duplicate reaction (user already reacted with this emoji)
    return null;
  }
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  const db = await getDb();
  if (!db) return false;

  const { messageReactions } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  
  await db
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      )
    );
  return true;
}

export async function getReactionsByMessage(messageId: string) {
  const db = await getDb();
  if (!db) return [];

  const { messageReactions, users } = await import("../drizzle/schema");
  return db
    .select({
      id: messageReactions.id,
      messageId: messageReactions.messageId,
      userId: messageReactions.userId,
      emoji: messageReactions.emoji,
      createdAt: messageReactions.createdAt,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(messageReactions)
    .leftJoin(users, eq(messageReactions.userId, users.id))
    .where(eq(messageReactions.messageId, messageId))
    .orderBy(messageReactions.createdAt);
}

// Thread Replies
export async function getThreadReplies(threadId: string, limit = 100) {
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
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
      fileType: messages.fileType,
      fileSize: messages.fileSize,
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
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

export async function getThreadReplyCount(messageId: string) {
  const db = await getDb();
  if (!db) return 0;

  const { messages } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  
  const results = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(eq(messages.threadId, messageId));
  
  return results[0]?.count || 0;
}

// Unread Message Tracking
export async function updateLastReadAt(channelId: string, userId: string) {
  const db = await getDb();
  if (!db) return false;

  const { channelMembers } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  
  await db
    .update(channelMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      )
    );
  
  return true;
}

export async function getUnreadCountForChannel(channelId: string, userId: string) {
  const db = await getDb();
  if (!db) return 0;

  const { channelMembers, messages } = await import("../drizzle/schema");
  const { and, eq, gt, sql } = await import("drizzle-orm");
  
  // Get user's lastReadAt for this channel
  const memberResults = await db
    .select({ lastReadAt: channelMembers.lastReadAt })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      )
    )
    .limit(1);
  
  const lastReadAt = memberResults[0]?.lastReadAt;
  if (!lastReadAt) {
    // If never read, count all messages
    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.channelId, channelId));
    return countResults[0]?.count || 0;
  }
  
  // Count messages after lastReadAt
  const countResults = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        gt(messages.createdAt, lastReadAt)
      )
    );
  
  return countResults[0]?.count || 0;
}

export async function getUnreadCountsForUser(userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { channelMembers, messages, channels } = await import("../drizzle/schema");
  const { and, eq, gt, sql } = await import("drizzle-orm");
  
  // Get all channels user is member of
  const userChannels = await db
    .select({
      channelId: channelMembers.channelId,
      lastReadAt: channelMembers.lastReadAt,
    })
    .from(channelMembers)
    .where(eq(channelMembers.userId, userId));
  
  const unreadCounts = [];
  
  for (const { channelId, lastReadAt } of userChannels) {
    let count = 0;
    
    if (!lastReadAt) {
      // Never read - count all messages
      const countResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.channelId, channelId));
      count = countResults[0]?.count || 0;
    } else {
      // Count messages after lastReadAt
      const countResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.channelId, channelId),
            gt(messages.createdAt, lastReadAt)
          )
        );
      count = countResults[0]?.count || 0;
    }
    
    if (count > 0) {
      unreadCounts.push({ channelId, unreadCount: count });
    }
  }
  
  return unreadCounts;
}

// Typing Indicators
export async function updateTypingIndicator(channelId: string, userId: string) {
  const db = await getDb();
  if (!db) return false;

  const { typingIndicators } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");
  const { and, eq } = await import("drizzle-orm");
  
  try {
    // Try to update existing indicator
    const existing = await db
      .select()
      .from(typingIndicators)
      .where(
        and(
          eq(typingIndicators.channelId, channelId),
          eq(typingIndicators.userId, userId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(typingIndicators)
        .set({ lastTypingAt: new Date() })
        .where(
          and(
            eq(typingIndicators.channelId, channelId),
            eq(typingIndicators.userId, userId)
          )
        );
    } else {
      // Insert new indicator
      await db.insert(typingIndicators).values({
        id: randomUUID(),
        channelId,
        userId,
        lastTypingAt: new Date(),
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error updating typing indicator:", error);
    return false;
  }
}

export async function getTypingUsers(channelId: string, excludeUserId?: string) {
  const db = await getDb();
  if (!db) return [];

  const { typingIndicators, users } = await import("../drizzle/schema");
  const { and, eq, gt, sql } = await import("drizzle-orm");
  
  // Get typing indicators from last 5 seconds
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  
  const conditions = [
    eq(typingIndicators.channelId, channelId),
    gt(typingIndicators.lastTypingAt, fiveSecondsAgo),
  ];
  
  if (excludeUserId) {
    const { ne } = await import("drizzle-orm");
    conditions.push(ne(typingIndicators.userId, excludeUserId));
  }
  
  const typingUsers = await db
    .select({
      userId: typingIndicators.userId,
      userName: users.name,
    })
    .from(typingIndicators)
    .leftJoin(users, eq(typingIndicators.userId, users.id))
    .where(and(...conditions));
  
  return typingUsers;
}

export async function clearTypingIndicator(channelId: string, userId: string) {
  const db = await getDb();
  if (!db) return false;

  const { typingIndicators } = await import("../drizzle/schema");
  const { and, eq } = await import("drizzle-orm");
  
  await db
    .delete(typingIndicators)
    .where(
      and(
        eq(typingIndicators.channelId, channelId),
        eq(typingIndicators.userId, userId)
      )
    );
  
  return true;
}

// Notifications
export async function createNotification(data: {
  id: string;
  tenantId: string;
  userId: string;
  type: "mention" | "reply" | "reaction";
  messageId?: string;
  channelId?: string;
  content?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const { notifications } = await import("../drizzle/schema");
  await db.insert(notifications).values(data);
  return data;
}

export async function getUserNotifications(userId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const { notifications } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");
  
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: string) {
  const db = await getDb();
  if (!db) return 0;

  const { notifications } = await import("../drizzle/schema");
  const { and, eq, sql } = await import("drizzle-orm");
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
  
  return result[0]?.count || 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const db = await getDb();
  if (!db) return false;

  const { notifications } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
  
  return true;
}

export async function markAllNotificationsAsRead(userId: string) {
  const db = await getDb();
  if (!db) return false;

  const { notifications } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
  
  return true;
}

// Parse @mentions from message content
export function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Get user IDs from usernames
export async function getUserIdsByUsernames(usernames: string[], tenantId: string): Promise<string[]> {
  const db = await getDb();
  if (!db || usernames.length === 0) return [];

  const { users } = await import("../drizzle/schema");
  const { and, eq, inArray, sql } = await import("drizzle-orm");
  
  // Extract name from email (before @)
  const results = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        sql`SUBSTRING_INDEX(${users.email}, '@', 1) IN (${sql.join(usernames.map(u => sql`${u}`), sql`, `)})`
      )
    );
  
  return results.map(r => r.id);
}

// Message Search
export async function searchMessages(params: {
  tenantId: string;
  query?: string;
  channelId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const { messages, users } = await import("../drizzle/schema");
  const { and, eq, like, gte, lte, desc } = await import("drizzle-orm");
  
  const conditions = [eq(messages.tenantId, params.tenantId)];
  
  if (params.query) {
    conditions.push(like(messages.content, `%${params.query}%`));
  }
  
  if (params.channelId) {
    conditions.push(eq(messages.channelId, params.channelId));
  }
  
  if (params.userId) {
    conditions.push(eq(messages.userId, params.userId));
  }
  
  if (params.startDate) {
    conditions.push(gte(messages.createdAt, params.startDate));
  }
  
  if (params.endDate) {
    conditions.push(lte(messages.createdAt, params.endDate));
  }
  
  return db
    .select({
      id: messages.id,
      tenantId: messages.tenantId,
      channelId: messages.channelId,
      userId: messages.userId,
      content: messages.content,
      threadId: messages.threadId,
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
      fileType: messages.fileType,
      fileSize: messages.fileSize,
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
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(params.limit || 50);
}

// AI Conversations
export async function createAIConversation(params: {
  tenantId: string;
  userId: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const id = crypto.randomUUID();
  await db.insert(aiConversations).values({
    id,
    ...params,
  });
  return id;
}

export async function getAIConversations(params: {
  tenantId: string;
  userId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.tenantId, params.tenantId),
        eq(aiConversations.userId, params.userId)
      )
    )
    .orderBy(desc(aiConversations.updatedAt));
}

export async function getAIConversation(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const results = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, id))
    .limit(1);
  return results[0];
}

export async function updateAIConversation(params: {
  id: string;
  title?: string;
  messages?: Array<{ role: string; content: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { id, ...updates } = params;
  await db
    .update(aiConversations)
    .set(updates)
    .where(eq(aiConversations.id, id));
}

export async function deleteAIConversation(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .delete(aiConversations)
    .where(eq(aiConversations.id, id));
}


// ============ AUTHENTICATION ============

export async function createUserWithAuth(data: {
  email: string;
  passwordHash: string;
  name?: string;
  twoFactorSecret: string;
  twoFactorEnabled: boolean;
  backupCodes: string[];
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const tenantId = nanoid(); // Create a new tenant for each user
  
  // Create tenant first
  await db.insert(tenants).values({
    id: tenantId,
    name: data.name || data.email,
  });
  
  // Create user
  await db.insert(users).values({
    id,
    tenantId,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: "owner",
    twoFactorSecret: data.twoFactorSecret,
    twoFactorEnabled: data.twoFactorEnabled,
    backupCodes: data.backupCodes,
  });
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0]!;
}



export async function enableTwoFactor(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ twoFactorEnabled: true })
    .where(eq(users.id, userId));
}

export async function removeBackupCode(userId: string, usedCode: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (!user || !user.backupCodes) return;

  const { verifyPassword } = await import("./auth");
  const codes = user.backupCodes as string[];
  
  // Remove the used code
  const updatedCodes = [];
  for (const hashedCode of codes) {
    if (!(await verifyPassword(usedCode, hashedCode))) {
      updatedCodes.push(hashedCode);
    }
  }
  
  await db
    .update(users)
    .set({ backupCodes: updatedCodes })
    .where(eq(users.id, userId));
}

export async function setPasswordResetToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    })
    .where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, token))
    .limit(1);
  
  return result[0];
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
}

export async function clearPasswordResetToken(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({
      passwordResetToken: null,
      passwordResetExpires: null,
    })
    .where(eq(users.id, userId));
}


// ============ EMAIL ACCOUNTS ============

export async function createEmailAccount(data: {
  tenantId: string;
  userId: string;
  email: string;
  provider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  imapHost: string;
  imapPort: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailAccounts } = await import("../drizzle/schema");
  const id = nanoid();
  
  // If this is the first email account, make it default
  const existing = await db.select().from(emailAccounts)
    .where(eq(emailAccounts.userId, data.userId))
    .limit(1);
  const isDefault = existing.length === 0;

  await db.insert(emailAccounts).values({
    id,
    ...data,
    isDefault,
  });

  const result = await db.select().from(emailAccounts)
    .where(eq(emailAccounts.id, id))
    .limit(1);
  return result[0]!;
}

export async function getEmailAccountsByUser(userId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { emailAccounts } = await import("../drizzle/schema");
  return db.select().from(emailAccounts)
    .where(eq(emailAccounts.userId, userId))
    .orderBy(desc(emailAccounts.createdAt));
}

export async function deleteEmailAccount(accountId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailAccounts } = await import("../drizzle/schema");
  await db.delete(emailAccounts).where(eq(emailAccounts.id, accountId));
}

export async function setDefaultEmailAccount(userId: string, accountId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailAccounts } = await import("../drizzle/schema");
  
  // Unset all defaults for this user
  await db.update(emailAccounts)
    .set({ isDefault: false })
    .where(eq(emailAccounts.userId, userId));

  // Set the new default
  await db.update(emailAccounts)
    .set({ isDefault: true })
    .where(eq(emailAccounts.id, accountId));
}


// ============ CAMPAIGNS ============

export async function createCampaign(data: {
  tenantId: string;
  userId: string;
  subject: string;
  body: string;
  recipientType: string;
  scheduledFor?: Date;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { marketingCampaigns } = await import("../drizzle/schema");
  const id = nanoid();
  
  await db.insert(marketingCampaigns).values({
    id,
    name: data.subject, // Use subject as name
    ...data,
    status: data.scheduledFor ? "scheduled" : "draft",
  });

  const result = await db.select().from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id))
    .limit(1);
  return result[0]!;
}

export async function getCampaignsByTenant(tenantId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { marketingCampaigns } = await import("../drizzle/schema");
  return db.select().from(marketingCampaigns)
    .where(eq(marketingCampaigns.tenantId, tenantId))
    .orderBy(desc(marketingCampaigns.createdAt));
}


// ============ ADMIN ============

export async function getAllUsersByTenant(tenantId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    twoFactorEnabled: users.twoFactorEnabled,
    disabled: users.disabled,
    createdAt: users.createdAt,
  }).from(users)
    .where(eq(users.tenantId, tenantId))
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ role: role as any })
    .where(eq(users.id, userId));
}

export async function toggleUserStatus(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  await db.update(users)
    .set({ disabled: !user.disabled })
    .where(eq(users.id, userId));
}

export async function resetUserTwoFactor(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      twoFactorEnabled: false,
      twoFactorSecret: null,
    })
    .where(eq(users.id, userId));
}

// ============ NOTES ============

export async function createNote(data: {
  tenantId: string;
  content: string;
  entityType: "contact" | "account" | "deal" | "task" | "thread";
  entityId: string;
  createdBy: string;
  createdByName: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { notes, activities } = await import("../drizzle/schema");
  const id = nanoid();
  
  // Insert note
  await db.insert(notes).values({
    id,
    ...data,
  });
  
  // Insert activity record for timeline
  const activityId = nanoid();
  await db.insert(activities).values({
    id: activityId,
    tenantId: data.tenantId,
    personId: data.entityType === 'contact' ? data.entityId : null,
    accountId: data.entityType === 'account' ? data.entityId : null,
    userId: data.createdBy,
    activityType: 'note',
    title: `Note added by ${data.createdByName}`,
    description: data.content,
    metadata: { noteId: id, entityType: data.entityType, entityId: data.entityId },
    externalSource: 'manual',
    timestamp: new Date(),
  });
  
  const result = await db.select().from(notes)
    .where(eq(notes.id, id))
    .limit(1);
  return result[0]!;
}

export async function updateNote(
  noteId: string,
  content: string,
  updatedBy: string,
  updatedByName: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { notes } = await import("../drizzle/schema");
  
  await db.update(notes)
    .set({ 
      content, 
      updatedBy, 
      updatedByName,
      updatedAt: new Date()
    })
    .where(eq(notes.id, noteId));
  
  const result = await db.select().from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  return result[0];
}

export async function getNotesByEntity(
  tenantId: string,
  entityType: "contact" | "account" | "deal" | "task" | "thread",
  entityId: string
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { notes } = await import("../drizzle/schema");
  
  return db.select().from(notes)
    .where(
      and(
        eq(notes.tenantId, tenantId),
        eq(notes.entityType, entityType),
        eq(notes.entityId, entityId)
      )
    )
    .orderBy(desc(notes.createdAt));
}

export async function deleteNote(noteId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { notes } = await import("../drizzle/schema");
  
  await db.delete(notes)
    .where(
      and(
        eq(notes.id, noteId),
        eq(notes.tenantId, tenantId)
      )
    );
}

// ============ CONTACT MERGE ============

export async function mergeContacts(data: {
  tenantId: string;
  sourceContactId: string;
  targetContactId: string;
  mergedFields: Record<string, any>;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { people, threads, moments, notes: notesTable } = await import("../drizzle/schema");
  
  // Update the target contact with merged fields
  await db.update(people)
    .set(data.mergedFields)
    .where(
      and(
        eq(people.id, data.targetContactId),
        eq(people.tenantId, data.tenantId)
      )
    );
  
  // Update all threads to point to target contact
  await db.update(threads)
    .set({ personId: data.targetContactId })
    .where(
      and(
        eq(threads.personId, data.sourceContactId),
        eq(threads.tenantId, data.tenantId)
      )
    );
  
  // Update all moments to point to target contact
  await db.update(moments)
    .set({ personId: data.targetContactId })
    .where(
      and(
        eq(moments.personId, data.sourceContactId),
        eq(moments.tenantId, data.tenantId)
      )
    );
  
  // Update all notes to point to target contact
  await db.update(notesTable)
    .set({ entityId: data.targetContactId })
    .where(
      and(
        eq(notesTable.entityId, data.sourceContactId),
        eq(notesTable.entityType, "contact"),
        eq(notesTable.tenantId, data.tenantId)
      )
    );
  
  // Delete the source contact
  await db.delete(people)
    .where(
      and(
        eq(people.id, data.sourceContactId),
        eq(people.tenantId, data.tenantId)
      )
    );
  
  // Return the updated target contact
  const result = await db.select().from(people)
    .where(
      and(
        eq(people.id, data.targetContactId),
        eq(people.tenantId, data.tenantId)
      )
    )
    .limit(1);
  
  return result[0];
}

// ============ SAVED FILTERS (SHARED VIEWS) ============

export async function createSavedFilter(data: {
  tenantId: string;
  name: string;
  viewType: "deals" | "contacts" | "accounts" | "tasks";
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  createdById: string;
  isPublic?: boolean;
  sharedWithUserIds?: string[];
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { sharedViews } = await import("../drizzle/schema");
  const id = nanoid();
  
  await db.insert(sharedViews).values({
    id,
    ...data,
  });
  
  const result = await db.select().from(sharedViews)
    .where(eq(sharedViews.id, id))
    .limit(1);
  return result[0]!;
}

export async function getSavedFilters(
  tenantId: string,
  userId: string,
  viewType?: "deals" | "contacts" | "accounts" | "tasks"
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { sharedViews } = await import("../drizzle/schema");
  
  const conditions = [
    eq(sharedViews.tenantId, tenantId),
    or(
      eq(sharedViews.createdById, userId),
      eq(sharedViews.isPublic, true)
    )
  ];
  
  if (viewType) {
    conditions.push(eq(sharedViews.viewType, viewType));
  }
  
  return db.select().from(sharedViews)
    .where(and(...conditions))
    .orderBy(desc(sharedViews.createdAt));
}

export async function updateSavedFilter(
  filterId: string,
  tenantId: string,
  data: {
    name?: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    isPublic?: boolean;
    sharedWithUserIds?: string[];
  }
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { sharedViews } = await import("../drizzle/schema");
  
  await db.update(sharedViews)
    .set(data)
    .where(
      and(
        eq(sharedViews.id, filterId),
        eq(sharedViews.tenantId, tenantId)
      )
    );
  
  const result = await db.select().from(sharedViews)
    .where(eq(sharedViews.id, filterId))
    .limit(1);
  return result[0];
}

export async function deleteSavedFilter(filterId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { sharedViews } = await import("../drizzle/schema");
  
  await db.delete(sharedViews)
    .where(
      and(
        eq(sharedViews.id, filterId),
        eq(sharedViews.tenantId, tenantId)
      )
    );
}

// ============ CONTEXTUAL NOTES (CROSS-ENTITY) ============

export async function getContextualNotes(params: {
  tenantId: string;
  entityType: "contact" | "account" | "deal" | "task" | "thread";
  entityId: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { notes: notesTable, people, threads } = await import("../drizzle/schema");
  const { entityType, entityId, tenantId } = params;
  
  // Start with direct notes on this entity
  const directNotes = await db.select().from(notesTable)
    .where(
      and(
        eq(notesTable.tenantId, tenantId),
        eq(notesTable.entityType, entityType),
        eq(notesTable.entityId, entityId)
      )
    )
    .orderBy(desc(notesTable.createdAt));
  
  // Add source information to direct notes
  const notesWithSource = directNotes.map((note: any) => ({
    ...note,
    source: entityType,
    sourceId: entityId,
    sourceName: null, // Will be populated for related notes
  }));
  
  // Fetch related notes based on entity type
  let relatedNotes: any[] = [];
  
  if (entityType === "contact") {
    // Get notes from deals this contact is involved in
    // Get notes from account (company) this contact belongs to
    const contact = await db.select().from(people)
      .where(
        and(
          eq(people.id, entityId),
          eq(people.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (contact[0]?.companyDomain) {
      // Get account notes
      const accountNotes = await db.select().from(notesTable)
        .where(
          and(
            eq(notesTable.tenantId, tenantId),
            eq(notesTable.entityType, "account")
          )
        );
      
      relatedNotes = relatedNotes.concat(
        accountNotes.map((note: any) => ({
          ...note,
          source: "account",
          sourceId: note.entityId,
          sourceName: contact[0].companyName || "Company",
        }))
      );
    }
    
    // Get thread notes for this contact
    const contactThreads = await db.select().from(threads)
      .where(
        and(
          eq(threads.personId, entityId),
          eq(threads.tenantId, tenantId)
        )
      );
    
    for (const thread of contactThreads) {
      const threadNotes = await db.select().from(notesTable)
        .where(
          and(
            eq(notesTable.tenantId, tenantId),
            eq(notesTable.entityType, "thread"),
            eq(notesTable.entityId, thread.id)
          )
        );
      
      relatedNotes = relatedNotes.concat(
        threadNotes.map((note: any) => ({
          ...note,
          source: "thread",
          sourceId: thread.id,
          sourceName: thread.title || "Thread",
        }))
      );
    }
  }
  
  if (entityType === "account") {
    // Get notes from all contacts in this account
    // Get notes from all deals for this account
    // This requires knowing which contacts belong to this account
    // For now, we'll implement the basic structure
  }
  
  if (entityType === "deal") {
    // Get notes from all contacts involved in this deal
    // Get notes from the account associated with this deal
  }
  
  // Combine and sort all notes by date
  const allNotes = [...notesWithSource, ...relatedNotes];
  return allNotes.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}


// ============ EMAIL EXAMPLES ============

export async function createEmailExample(data: {
  userId: string;
  subject: string;
  body: string;
  context?: string;
  category?: string;
  performanceMetrics?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailExamples } = await import("../drizzle/schema");
  const id = nanoid();
  await db.insert(emailExamples).values({
    id,
    ...data,
  });
  return { id };
}

export async function getEmailExamples(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const { emailExamples } = await import("../drizzle/schema");
  return await db
    .select()
    .from(emailExamples)
    .where(eq(emailExamples.userId, userId))
    .orderBy(desc(emailExamples.createdAt));
}

export async function deleteEmailExample(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { emailExamples } = await import("../drizzle/schema");
  await db
    .delete(emailExamples)
    .where(and(eq(emailExamples.id, id), eq(emailExamples.userId, userId)));
  return { success: true };
}


// ============ GLOBAL SEARCH ============

export async function searchPeople(tenantId: string, query: string) {
  const db = await getDb();
  if (!db) return [];

  const { people } = await import("../drizzle/schema");
  const { like, or } = await import("drizzle-orm");
  
  return await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.tenantId, tenantId),
        or(
          like(people.fullName, query),
          like(people.primaryEmail, query),
          like(people.companyName, query)
        )
      )
    )
    .limit(10);
}

export async function searchAccounts(tenantId: string, query: string) {
  const db = await getDb();
  if (!db) return [];

  const { accounts } = await import("../drizzle/schema");
  const { like, or } = await import("drizzle-orm");
  
  return await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.tenantId, tenantId),
        or(
          like(accounts.name, query),
          like(accounts.domain, query)
        )
      )
    )
    .limit(10);
}

export async function searchThreads(tenantId: string, query: string) {
  const db = await getDb();
  if (!db) return [];

  const { threads } = await import("../drizzle/schema");
  const { like, or } = await import("drizzle-orm");
  
  return await db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.tenantId, tenantId),
        or(
          like(threads.title, query),
          like(threads.intent, query)
        )
      )
    )
    .limit(10);
}

// ==================== Tag Management ====================

export async function getAllTags(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { tags } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  return await db
    .select()
    .from(tags)
    .where(eq(tags.tenantId, tenantId))
    .orderBy(tags.name);
}

export async function createTag(tenantId: string, name: string, color?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { tags } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  const newTag = {
    id: randomUUID(),
    tenantId,
    name,
    color: color || "#3b82f6",
  };

  await db.insert(tags).values(newTag);
  return newTag;
}

export async function deleteTag(tagId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { tags, personTags, accountTags } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  // Delete all associations first
  await db.delete(personTags).where(eq(personTags.tagId, tagId));
  await db.delete(accountTags).where(eq(accountTags.tagId, tagId));

  // Delete the tag
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.tenantId, tenantId)));
}

export async function addTagToPerson(personId: string, tagId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { personTags } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  await db.insert(personTags).values({
    id: randomUUID(),
    personId,
    tagId,
  }).onDuplicateKeyUpdate({ set: { personId, tagId } });
}

export async function removeTagFromPerson(personId: string, tagId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { personTags } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  await db.delete(personTags).where(
    and(eq(personTags.personId, personId), eq(personTags.tagId, tagId))
  );
}

export async function getPersonTags(personId: string) {
  const db = await getDb();
  if (!db) return [];

  const { personTags, tags } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  return await db
    .select({ tag: tags })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(eq(personTags.personId, personId));
}

export async function addTagToAccount(accountId: string, tagId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { accountTags } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  await db.insert(accountTags).values({
    id: randomUUID(),
    accountId,
    tagId,
  }).onDuplicateKeyUpdate({ set: { accountId, tagId } });
}

export async function removeTagFromAccount(accountId: string, tagId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { accountTags } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  await db.delete(accountTags).where(
    and(eq(accountTags.accountId, accountId), eq(accountTags.tagId, tagId))
  );
}

export async function getAccountTags(accountId: string) {
  const db = await getDb();
  if (!db) return [];

  const { accountTags, tags } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  return await db
    .select({ tag: tags })
    .from(accountTags)
    .innerJoin(tags, eq(accountTags.tagId, tags.id))
    .where(eq(accountTags.accountId, accountId));
}

// ==================== User Assignment ====================

export async function assignPeopleToUser(personIds: string[], userId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { people } = await import("../drizzle/schema");
  const { eq, inArray, and } = await import("drizzle-orm");

  await db
    .update(people)
    .set({
      assignedToUserId: userId,
      assignedAt: new Date(),
    })
    .where(
      and(
        eq(people.tenantId, tenantId),
        inArray(people.id, personIds)
      )
    );
}

export async function unassignPeople(personIds: string[], tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { people } = await import("../drizzle/schema");
  const { eq, inArray, and } = await import("drizzle-orm");

  await db
    .update(people)
    .set({
      assignedToUserId: null,
      assignedAt: null,
    })
    .where(
      and(
        eq(people.tenantId, tenantId),
        inArray(people.id, personIds)
      )
    );
}

export async function getTeamMembers(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId));
}

// ==================== Sequence Enrollment ====================

export async function getAllSequences(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const { emailSequences } = await import("../drizzle/schema");
  const { eq, ne } = await import("drizzle-orm");

  return await db
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.tenantId, tenantId),
        ne(emailSequences.status, "archived")
      )
    )
    .orderBy(emailSequences.name);
}

export async function enrollPeopleInSequence(
  personIds: string[],
  sequenceId: string,
  tenantId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { emailSequenceEnrollments } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  const enrollments = personIds.map((personId) => ({
    id: randomUUID(),
    tenantId,
    sequenceId,
    personId,
    currentStep: 0,
    status: "active" as const,
  }));

  await db.insert(emailSequenceEnrollments).values(enrollments);
}


// ==================== Email Tracking ====================

export async function recordEmailTrackingEvent(data: {
  tenantId: string;
  emailId: string;
  personId?: string;
  eventType: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed";
  clickedUrl?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { emailTrackingEvents } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  await db.insert(emailTrackingEvents).values({
    id: randomUUID(),
    ...data,
  });
}

export async function getEmailTrackingStats(emailId: string) {
  const db = await getDb();
  if (!db) return null;

  const { emailTrackingEvents } = await import("../drizzle/schema");
  const { eq, sql } = await import("drizzle-orm");

  const stats = await db
    .select({
      eventType: emailTrackingEvents.eventType,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(emailTrackingEvents)
    .where(eq(emailTrackingEvents.emailId, emailId))
    .groupBy(emailTrackingEvents.eventType);

  return stats.reduce((acc, { eventType, count }) => {
    acc[eventType] = count;
    return acc;
  }, {} as Record<string, number>);
}

export async function getPersonEmailStats(personId: string, tenantId: string) {
  const db = await getDb();
  if (!db) return { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };

  const { emailTrackingEvents } = await import("../drizzle/schema");
  const { eq, and, sql } = await import("drizzle-orm");

  const stats = await db
    .select({
      eventType: emailTrackingEvents.eventType,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(emailTrackingEvents)
    .where(
      and(
        eq(emailTrackingEvents.personId, personId),
        eq(emailTrackingEvents.tenantId, tenantId)
      )
    )
    .groupBy(emailTrackingEvents.eventType);

  const counts = stats.reduce((acc, { eventType, count }) => {
    acc[eventType] = count;
    return acc;
  }, {} as Record<string, number>);

  const sent = counts.sent || 0;
  const opened = counts.opened || 0;
  const clicked = counts.clicked || 0;

  return {
    sent,
    opened,
    clicked,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
  };
}

// ==================== Activity Timeline ====================

export async function createActivity(data: {
  tenantId: string;
  personId?: string;
  accountId?: string;
  userId?: string;
  activityType: "email" | "call" | "meeting" | "note" | "task" | "deal_stage_change" | "tag_added" | "assignment_changed";
  title: string;
  description?: string;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { activities } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");

  await db.insert(activities).values({
    id: randomUUID(),
    ...data,
  });
}

export async function getActivitiesByPerson(personId: string, tenantId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const { activities } = await import("../drizzle/schema");
  const { eq, and, desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.personId, personId),
        eq(activities.tenantId, tenantId)
      )
    )
    .orderBy(desc(activities.timestamp))
    .limit(limit);
}

export async function getActivitiesByAccount(accountId: string, tenantId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const { activities } = await import("../drizzle/schema");
  const { eq, and, desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.accountId, accountId),
        eq(activities.tenantId, tenantId)
      )
    )
    .orderBy(desc(activities.timestamp))
    .limit(limit);
}

export async function getActivitiesByType(
  tenantId: string,
  activityType: string,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  const { activities } = await import("../drizzle/schema");
  const { eq, and, desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, tenantId),
        eq(activities.activityType, activityType as any)
      )
    )
    .orderBy(desc(activities.timestamp))
    .limit(limit);
}

// ==================== Amplemarket Sync ====================

export async function createSyncLog(data: {
  id: string;
  tenantId: string;
  syncType: 'full' | 'incremental' | 'preview' | 'list_counts';
  status: 'pending' | 'running' | 'completed' | 'failed';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { amplemarketSyncLogs } = await import("../drizzle/schema");

  await db.insert(amplemarketSyncLogs).values(data);
}

export async function updateSyncLog(
  id: string,
  data: {
    status?: 'pending' | 'running' | 'completed' | 'failed';
    errorMessage?: string;
    metadata?: any;
    errors?: string[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { amplemarketSyncLogs } = await import("../drizzle/schema");
  const { eq, sql } = await import("drizzle-orm");

  const updates: any = {};
  if (data.status) updates.status = data.status;
  if (data.errorMessage) updates.errorMessage = data.errorMessage;
  if (data.metadata) updates.metadata = data.metadata;
  if (data.errors) updates.errors = data.errors;
  
  if (data.status === 'completed' || data.status === 'failed') {
    updates.completedAt = sql`NOW()`;
  }

  await db
    .update(amplemarketSyncLogs)
    .set(updates)
    .where(eq(amplemarketSyncLogs.id, id));
}

export async function cacheListCount(
  tenantId: string,
  data: {
    listId: string;
    listName: string;
    owner?: string;
    shared: boolean;
    contactCount: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { amplemarketListCache } = await import("../drizzle/schema");
  const { randomUUID } = await import("crypto");
  const { eq, and, sql } = await import("drizzle-orm");

  // Check if exists
  const existing = await db
    .select()
    .from(amplemarketListCache)
    .where(
      and(
        eq(amplemarketListCache.tenantId, tenantId),
        eq(amplemarketListCache.listId, data.listId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(amplemarketListCache)
      .set({
        listName: data.listName,
        owner: data.owner || null,
        shared: data.shared,
        contactCount: data.contactCount,
        lastFetchedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(amplemarketListCache.tenantId, tenantId),
          eq(amplemarketListCache.listId, data.listId)
        )
      );
  } else {
    // Insert new
    await db.insert(amplemarketListCache).values({
      id: randomUUID(),
      tenantId,
      ...data,
    });
  }
}

export async function getCachedListCounts(tenantId: string, userEmail?: string) {
  const db = await getDb();
  if (!db) return [];

  const { amplemarketListCache } = await import("../drizzle/schema");
  const { eq, and, or, asc } = await import("drizzle-orm");

  if (userEmail) {
    return await db
      .select()
      .from(amplemarketListCache)
      .where(
        and(
          eq(amplemarketListCache.tenantId, tenantId),
          or(
            eq(amplemarketListCache.owner, userEmail),
            eq(amplemarketListCache.shared, true)
          )
        )
      )
      .orderBy(asc(amplemarketListCache.listName));
  }

  return await db
    .select()
    .from(amplemarketListCache)
    .where(eq(amplemarketListCache.tenantId, tenantId))
    .orderBy(asc(amplemarketListCache.listName));
}

export async function getAmplemarketSyncHistory(tenantId: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const { amplemarketSyncLogs } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(amplemarketSyncLogs)
    .where(eq(amplemarketSyncLogs.tenantId, tenantId))
    .orderBy(desc(amplemarketSyncLogs.startedAt))
    .limit(limit);
}

export async function getLatestSyncStatus(tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const { amplemarketSyncLogs } = await import("../drizzle/schema");
  const { eq, and, ne, desc } = await import("drizzle-orm");

  const results = await db
    .select()
    .from(amplemarketSyncLogs)
    .where(
      and(
        eq(amplemarketSyncLogs.tenantId, tenantId),
        ne(amplemarketSyncLogs.syncType, 'list_counts')
      )
    )
    .orderBy(desc(amplemarketSyncLogs.startedAt))
    .limit(1);

  return results[0] || null;
}

/**
 * ============================================
 * LEAD HELPERS (Amplemarket canonical entity)
 * ============================================
 */

/**
 * Get all leads for a tenant with optional filtering
 */
export async function getLeads(
  tenantId: string,
  options: {
    ownerEmail?: string;
    source?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const { leads } = await import("../drizzle/schema");
  const { like } = await import("drizzle-orm");

  let conditions = [eq(leads.tenantId, tenantId)];

  if (options.ownerEmail) {
    conditions.push(eq(leads.ownerEmail, options.ownerEmail));
  }

  if (options.source) {
    conditions.push(eq(leads.source, options.source));
  }

  let baseQuery = db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.syncedAt));

  if (options.limit && options.offset) {
    return await baseQuery.limit(options.limit).offset(options.offset);
  } else if (options.limit) {
    return await baseQuery.limit(options.limit);
  } else if (options.offset) {
    return await baseQuery.offset(options.offset);
  }

  return await baseQuery;
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(
  tenantId: string,
  leadId: string
) {
  const db = await getDb();
  if (!db) return null;

  const { leads } = await import("../drizzle/schema");

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(
      eq(leads.tenantId, tenantId),
      eq(leads.id, leadId)
    ))
    .limit(1);

  return lead || null;
}

/**
 * Search leads by email, name, or company
 */
export async function searchLeads(
  tenantId: string,
  searchTerm: string,
  options: {
    ownerEmail?: string;
    limit?: number;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const { leads } = await import("../drizzle/schema");
  const { like } = await import("drizzle-orm");

  const searchPattern = `%${searchTerm}%`;
  
  let conditions = [
    eq(leads.tenantId, tenantId),
    or(
      like(leads.email, searchPattern),
      like(leads.firstName, searchPattern),
      like(leads.lastName, searchPattern),
      like(leads.company, searchPattern)
    )
  ];

  if (options.ownerEmail) {
    conditions.push(eq(leads.ownerEmail, options.ownerEmail));
  }

  let baseQuery = db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.syncedAt));

  if (options.limit) {
    return await baseQuery.limit(options.limit);
  }

  return await baseQuery;
}

/**
 * Get lead count by owner
 */
export async function getLeadCountByOwner(
  tenantId: string,
  ownerEmail: string
) {
  const db = await getDb();
  if (!db) return 0;

  const { leads } = await import("../drizzle/schema");

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(and(
      eq(leads.tenantId, tenantId),
      eq(leads.ownerEmail, ownerEmail)
    ));

  return result[0]?.count || 0;
}

/**
 * Delete a lead
 */
export async function deleteLead(
  tenantId: string,
  leadId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { leads } = await import("../drizzle/schema");

  await db
    .delete(leads)
    .where(and(
      eq(leads.tenantId, tenantId),
      eq(leads.id, leadId)
    ));
}

// ============ DEMO BOOKINGS ============

/**
 * Get demo bookings for a sales manager on a specific date
 */
export async function getDemoBookingsByManagerAndDate(
  tenantId: string,
  salesManagerId: string,
  startDate: Date,
  endDate: Date
): Promise<DemoBooking[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(demoBookings)
    .where(
      and(
        eq(demoBookings.tenantId, tenantId),
        eq(demoBookings.salesManagerId, salesManagerId),
        sql`${demoBookings.startTime} >= ${startDate}`,
        sql`${demoBookings.startTime} < ${endDate}`
      )
    )
    .orderBy(asc(demoBookings.startTime));

  return result;
}

/**
 * Create a new demo booking
 */
export async function createDemoBooking(
  data: Omit<InsertDemoBooking, "id">
): Promise<DemoBooking> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(demoBookings).values({ id, ...data });

  const result = await db
    .select()
    .from(demoBookings)
    .where(eq(demoBookings.id, id))
    .limit(1);

  return result[0]!;
}

/**
 * Get all users with specific roles (for manager dropdown)
 */
export async function getUsersByRoles(
  tenantId: string,
  roles: string[]
): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        sql`${users.role} IN (${sql.join(roles.map(r => sql.raw(`'${r}'`)), sql`, `)})`
      )
    )
    .orderBy(asc(users.name));

  return result;
}

// ============ ACCOUNT MERGE ============

/**
 * Merge two accounts - transfer all related data and delete source
 */
export async function mergeAccounts(
  tenantId: string,
  sourceId: string,
  targetId: string,
  mergedFields: Partial<Account>
): Promise<{ success: boolean; contactsTransferred: number; dealsTransferred: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify both accounts exist and belong to tenant
  const [sourceAccount, targetAccount] = await Promise.all([
    db.select().from(accounts).where(and(eq(accounts.id, sourceId), eq(accounts.tenantId, tenantId))).limit(1),
    db.select().from(accounts).where(and(eq(accounts.id, targetId), eq(accounts.tenantId, tenantId))).limit(1)
  ]);

  if (!sourceAccount[0] || !targetAccount[0]) {
    throw new Error("Source or target account not found");
  }

  // Update target account with merged fields
  await db
    .update(accounts)
    .set({ ...mergedFields, updatedAt: new Date() })
    .where(eq(accounts.id, targetId));

  // Transfer all people (contacts) from source to target
  const contactsResult = await db
    .update(people)
    .set({ accountId: targetId })
    .where(and(eq(people.tenantId, tenantId), eq(people.accountId, sourceId)));

  // Count transferred contacts
  const contactsTransferred = await db
    .select({ count: sql<number>`count(*)` })
    .from(people)
    .where(and(eq(people.tenantId, tenantId), eq(people.accountId, targetId)));

  // Delete source account
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, sourceId), eq(accounts.tenantId, tenantId)));

  return {
    success: true,
    contactsTransferred: contactsTransferred[0]?.count || 0,
    dealsTransferred: 0 // No deals table in current schema
  };
}

/**
 * Find potential duplicate accounts by name
 */
export async function findDuplicateAccounts(
  tenantId: string,
  accountName: string
): Promise<Account[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.tenantId, tenantId),
        sql`LOWER(${accounts.name}) = LOWER(${accountName})`
      )
    )
    .limit(10);

  return result;
}

// ============ CALENDAR VIEW ============

/**
 * Get all demo bookings for a tenant within a date range (for calendar view)
 */
export async function getDemoBookingsByDateRange(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DemoBooking[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(demoBookings)
    .where(
      and(
        eq(demoBookings.tenantId, tenantId),
        sql`${demoBookings.startTime} >= ${startDate}`,
        sql`${demoBookings.startTime} < ${endDate}`
      )
    )
    .orderBy(asc(demoBookings.startTime));
}

/**
 * Get all demo bookings for a specific user (as manager or booker) within a date range
 */
export async function getDemoBookingsByUserAndDateRange(
  tenantId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DemoBooking[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(demoBookings)
    .where(
      and(
        eq(demoBookings.tenantId, tenantId),
        or(
          eq(demoBookings.salesManagerId, userId),
          eq(demoBookings.bookedByUserId, userId)
        ),
        sql`${demoBookings.startTime} >= ${startDate}`,
        sql`${demoBookings.startTime} < ${endDate}`
      )
    )
    .orderBy(asc(demoBookings.startTime));
}

/**
 * Cancel a demo booking
 */
export async function cancelDemoBooking(
  tenantId: string,
  bookingId: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(demoBookings)
    .set({ status: "cancelled" })
    .where(and(eq(demoBookings.id, bookingId), eq(demoBookings.tenantId, tenantId)));
}

/**
 * Get a single demo booking by ID
 */
export async function getDemoBookingById(
  tenantId: string,
  bookingId: string
): Promise<DemoBooking | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(demoBookings)
    .where(and(eq(demoBookings.id, bookingId), eq(demoBookings.tenantId, tenantId)))
    .limit(1);
  return result[0] ?? null;
}
