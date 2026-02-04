import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { moments, people, Moment } from "../drizzle/schema";

/**
 * Get all activity moments for an account by fetching moments
 * for all contacts linked to that account
 */
export async function getMomentsByAccount(tenantId: string, accountId: string): Promise<Moment[]> {
  const db = await getDb();
  if (!db) return [];

  // First, get all people IDs for this account
  const contacts = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.tenantId, tenantId), eq(people.accountId, accountId)));

  if (contacts.length === 0) {
    return [];
  }

  const personIds = contacts.map(c => c.id);

  // Then get all moments for these people
  const activities = await db
    .select()
    .from(moments)
    .where(
      and(
        eq(moments.tenantId, tenantId),
        inArray(moments.personId, personIds)
      )
    )
    .orderBy(desc(moments.timestamp))
    .limit(100);

  return activities;
}
