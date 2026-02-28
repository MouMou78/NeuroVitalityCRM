/**
 * notificationRouter.ts
 * REST endpoints for in-app notifications and notification preferences.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./_core/db";
import { users } from "../drizzle/schema";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  updateUserNotificationPrefs,
} from "./notificationService";
import { triggerDealAnalysisForTenant } from "./dealAlertScheduler";

const router = Router();

// Helper to get the authenticated user from cookie session
async function getAuthUser(req: any) {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) return null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: users.id,
    tenantId: users.tenantId,
    role: users.role,
    email: users.email,
    name: users.name,
  })
    .from(users)
    .where(eq(users.sessionToken, sessionToken))
    .limit(1);
  return result[0] || null;
}

// GET /api/notifications — list notifications for the current user
router.get("/notifications", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const unreadOnly = req.query.unread === "true";
    const notifs = await getNotifications(user.tenantId, user.id, unreadOnly);
    const unreadCount = await getUnreadCount(user.tenantId, user.id);

    res.json({ notifications: notifs, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/notifications/unread-count — just the count (for polling)
router.get("/notifications/unread-count", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const count = await getUnreadCount(user.tenantId, user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/mark-read — mark one or all as read
router.post("/notifications/mark-read", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { notificationId } = req.body; // optional — if omitted, marks all
    await markAsRead(user.tenantId, user.id, notificationId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/notifications/:id — delete a notification
router.delete("/notifications/:id", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await deleteNotification(user.tenantId, user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/notifications/preferences — get notification preferences
router.get("/notifications/preferences", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    // Try to get prefs from users table (may not exist pre-migration)
    try {
      const result = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const u = result[0] as any;
      res.json({
        dealAlertEmailEnabled: u?.dealAlertEmailEnabled ?? false,
        dealAlertEmailSeverity: u?.dealAlertEmailSeverity ?? "high",
        dealAlertInAppEnabled: u?.dealAlertInAppEnabled ?? true,
        dealAlertFrequency: u?.dealAlertFrequency ?? "immediate",
      });
    } catch {
      res.json({
        dealAlertEmailEnabled: false,
        dealAlertEmailSeverity: "high",
        dealAlertInAppEnabled: true,
        dealAlertFrequency: "immediate",
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/notifications/preferences — update notification preferences
router.put("/notifications/preferences", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { dealAlertEmailEnabled, dealAlertEmailSeverity, dealAlertInAppEnabled, dealAlertFrequency } = req.body;
    await updateUserNotificationPrefs(user.id, {
      dealAlertEmailEnabled,
      dealAlertEmailSeverity,
      dealAlertInAppEnabled,
      dealAlertFrequency,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/trigger-analysis — manually trigger deal intelligence
router.post("/notifications/trigger-analysis", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const result = await triggerDealAnalysisForTenant(user.tenantId, user.id);
    res.json(result);
  } catch (err) {
    console.error("POST /api/notifications/trigger-analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
