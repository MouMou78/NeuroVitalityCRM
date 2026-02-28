/**
 * Notification Service
 * Handles in-app notifications and email alerts for deal intelligence and other events.
 */

import { randomUUID } from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./_core/db";
import { notifications, users } from "../drizzle/schema";
import { sendDealAlertEmail } from "./email";

export interface CreateNotificationOptions {
  tenantId: string;
  userId: string;
  type: "deal_alert" | "meeting_summary" | "task_due" | "system";
  title: string;
  body: string;
  severity?: "low" | "medium" | "high" | "critical";
  entityType?: string;
  entityId?: string;
  entityName?: string;
  actionUrl?: string;
  sendEmail?: boolean;
  userEmail?: string;
  userName?: string;
}

export async function createNotification(opts: CreateNotificationOptions): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();

  await db.insert(notifications).values({
    id,
    tenantId: opts.tenantId,
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    severity: opts.severity || "medium",
    entityType: opts.entityType,
    entityId: opts.entityId,
    entityName: opts.entityName,
    actionUrl: opts.actionUrl,
    read: false,
  });

  // Send email if requested and user has email alerts enabled
  if (opts.sendEmail && opts.userEmail) {
    try {
      await sendDealAlertEmail({
        to: opts.userEmail,
        name: opts.userName || "Team Member",
        title: opts.title,
        body: opts.body,
        severity: opts.severity || "medium",
        entityName: opts.entityName,
        actionUrl: opts.actionUrl,
      });
    } catch (err) {
      console.error("Failed to send alert email:", err);
      // Don't throw — notification was still created in-app
    }
  }

  return id;
}

export async function getNotifications(tenantId: string, userId: string, unreadOnly = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    eq(notifications.tenantId, tenantId),
    eq(notifications.userId, userId),
  ];

  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  return db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
      eq(notifications.read, false),
    ));

  return Number(result[0]?.count || 0);
}

export async function markAsRead(tenantId: string, userId: string, notificationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    eq(notifications.tenantId, tenantId),
    eq(notifications.userId, userId),
  ];

  if (notificationId) {
    conditions.push(eq(notifications.id, notificationId));
  } else {
    // Mark all as read
    conditions.push(eq(notifications.read, false));
  }

  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(...conditions));
}

export async function deleteNotification(tenantId: string, userId: string, notificationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications)
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
    ));
}

/**
 * Get user notification preferences from the users table.
 * Falls back to defaults if the columns don't exist yet (pre-migration).
 */
export async function getUserNotificationPrefs(userId: string) {
  const db = await getDb();
  if (!db) return getDefaultPrefs();

  try {
    const result = await db.select({
      dealAlertEmailEnabled: (users as any).dealAlertEmailEnabled,
      dealAlertEmailSeverity: (users as any).dealAlertEmailSeverity,
      dealAlertInAppEnabled: (users as any).dealAlertInAppEnabled,
      dealAlertFrequency: (users as any).dealAlertFrequency,
      email: users.email,
      name: users.name,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result[0]) return getDefaultPrefs();

    return {
      emailEnabled: result[0].dealAlertEmailEnabled ?? true,
      emailSeverity: result[0].dealAlertEmailSeverity ?? "medium",
      inAppEnabled: result[0].dealAlertInAppEnabled ?? true,
      frequency: result[0].dealAlertFrequency ?? "immediate",
      email: result[0].email,
      name: result[0].name || "Team Member",
    };
  } catch {
    return getDefaultPrefs();
  }
}

function getDefaultPrefs() {
  return {
    emailEnabled: false, // Off by default until SMTP is configured
    emailSeverity: "high",
    inAppEnabled: true,
    frequency: "immediate",
    email: null,
    name: "Team Member",
  };
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPrefs(userId: string, prefs: {
  dealAlertEmailEnabled?: boolean;
  dealAlertEmailSeverity?: string;
  dealAlertInAppEnabled?: boolean;
  dealAlertFrequency?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(users)
      .set(prefs as any)
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("Failed to update notification prefs:", err);
  }
}
