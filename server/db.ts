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
  integrations, Integration, InsertIntegration,
  aiConversations
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
