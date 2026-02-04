import { getDb } from "./db";
import { moments } from "../drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";

export interface ContactActivitySummary {
  personId: string;
  emailCount: number;
  meetingCount: number;
  callCount: number;
  totalActivities: number;
  lastActivityDate: Date | null;
}

/**
 * Get activity summary for a list of contacts
 * Returns counts of emails, meetings, and calls in the last 90 days
 */
export async function getContactActivitySummaries(
  tenantId: string,
  personIds: string[]
): Promise<Map<string, ContactActivitySummary>> {
  if (personIds.length === 0) {
    return new Map();
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Query moments for activity counts
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }
  const activities = await db
    .select({
      personId: moments.personId,
      momentType: moments.type,
      count: sql<number>`COUNT(*)`.as('count'),
      lastActivity: sql<Date>`MAX(${moments.createdAt})`.as('lastActivity'),
    })
    .from(moments)
    .where(
      and(
        eq(moments.tenantId, tenantId),
        sql`${moments.personId} IN (${sql.join(personIds.map(id => sql`${id}`), sql`, `)})`,
        gte(moments.createdAt, ninetyDaysAgo)
      )
    )
    .groupBy(moments.personId, moments.type);

  // Aggregate by person
  const summaryMap = new Map<string, ContactActivitySummary>();

  // Initialize all contacts with zero counts
  for (const personId of personIds) {
    summaryMap.set(personId, {
      personId,
      emailCount: 0,
      meetingCount: 0,
      callCount: 0,
      totalActivities: 0,
      lastActivityDate: null,
    });
  }

  // Fill in actual activity counts
  for (const activity of activities) {
    if (!activity.personId) continue;

    const summary = summaryMap.get(activity.personId);
    if (!summary) continue;

    const count = Number(activity.count) || 0;

    switch (activity.momentType) {
      case 'email_sent':
      case 'email_received':
      case 'reply_received':
        summary.emailCount += count;
        break;
      case 'meeting_held':
        summary.meetingCount += count;
        break;
      case 'call_completed':
        summary.callCount += count;
        break;
    }

    summary.totalActivities += count;

    // Update last activity date
    if (activity.lastActivity) {
      const activityDate = new Date(activity.lastActivity);
      if (!summary.lastActivityDate || activityDate > summary.lastActivityDate) {
        summary.lastActivityDate = activityDate;
      }
    }
  }

  return summaryMap;
}
