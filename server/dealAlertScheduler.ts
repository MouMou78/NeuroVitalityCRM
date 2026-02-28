/**
 * dealAlertScheduler.ts
 *
 * Runs deal intelligence analysis automatically every 6 hours for all tenants.
 * When new alerts are generated, creates in-app notifications and optionally
 * sends email alerts based on user preferences.
 */

import { getDb } from "./_core/db";
import { tenants, users, dealIntelligenceAlerts } from "../drizzle/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { runDealIntelligence } from "./dealIntelligenceEngine";
import { createNotification, getUserNotificationPrefs } from "./notificationService";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function severityMeetsThreshold(alertSeverity: string, threshold: string): boolean {
  return (SEVERITY_ORDER[alertSeverity] || 0) >= (SEVERITY_ORDER[threshold] || 0);
}

/**
 * Run deal intelligence for all tenants and create notifications for new alerts.
 */
async function runScheduledAnalysis() {
  if (isRunning) {
    console.log("[DealAlertScheduler] Already running, skipping this cycle");
    return;
  }

  isRunning = true;
  console.log("[DealAlertScheduler] Starting scheduled deal intelligence analysis...");

  try {
    const db = await getDb();
    if (!db) {
      console.log("[DealAlertScheduler] Database not available, skipping");
      return;
    }

    // Get all active tenants
    const allTenants = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);
    console.log(`[DealAlertScheduler] Processing ${allTenants.length} tenant(s)`);

    for (const tenant of allTenants) {
      try {
        await processAlertForTenant(tenant.id, db);
      } catch (err) {
        console.error(`[DealAlertScheduler] Error processing tenant ${tenant.id}:`, err);
      }
    }

    console.log("[DealAlertScheduler] Scheduled analysis complete");
  } catch (err) {
    console.error("[DealAlertScheduler] Fatal error:", err);
  } finally {
    isRunning = false;
  }
}

async function processAlertForTenant(tenantId: string, db: any) {
  // Run the deal intelligence engine
  const result = await runDealIntelligence(tenantId);
  if (result.alertsCreated === 0) return;

  console.log(`[DealAlertScheduler] Tenant ${tenantId}: ${result.alertsCreated} new alerts created`);

  // Get the newly created alerts (created in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const newAlerts = await db.select()
    .from(dealIntelligenceAlerts)
    .where(and(
      eq(dealIntelligenceAlerts.tenantId, tenantId),
      gt(dealIntelligenceAlerts.createdAt, fiveMinutesAgo),
      isNull(dealIntelligenceAlerts.dismissedAt),
    ))
    .limit(20);

  if (newAlerts.length === 0) return;

  // Get all users in this tenant to notify
  const tenantUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
  })
    .from(users)
    .where(eq(users.tenantId, tenantId));

  // For each user, create in-app notifications (and email if configured)
  for (const user of tenantUsers) {
    try {
      const prefs = await getUserNotificationPrefs(user.id);

      if (!prefs.inAppEnabled && !prefs.emailEnabled) continue;

      for (const alert of newAlerts) {
        const severity = alert.severity || "medium";

        // Check if this alert meets the user's severity threshold
        if (!severityMeetsThreshold(severity, prefs.emailSeverity)) continue;

        const actionUrl = alert.dealId
          ? `${process.env.APP_URL || "https://www.crmneurovitality.com"}/deals/${alert.dealId}`
          : undefined;

        if (prefs.inAppEnabled) {
          await createNotification({
            tenantId,
            userId: user.id,
            type: "deal_alert",
            title: alert.title || "Deal Intelligence Alert",
            body: alert.description || "",
            severity: severity as any,
            entityType: "deal",
            entityId: alert.dealId || undefined,
            entityName: alert.dealName || undefined,
            actionUrl,
            sendEmail: prefs.emailEnabled,
            userEmail: prefs.email || undefined,
            userName: prefs.name,
          });
        } else if (prefs.emailEnabled) {
          // Email only (no in-app)
          await createNotification({
            tenantId,
            userId: user.id,
            type: "deal_alert",
            title: alert.title || "Deal Intelligence Alert",
            body: alert.description || "",
            severity: severity as any,
            entityType: "deal",
            entityId: alert.dealId || undefined,
            entityName: alert.dealName || undefined,
            actionUrl,
            sendEmail: true,
            userEmail: prefs.email || undefined,
            userName: prefs.name,
          });
        }
      }
    } catch (err) {
      console.error(`[DealAlertScheduler] Error notifying user ${user.id}:`, err);
    }
  }
}

/**
 * Start the scheduler. Call once at server startup.
 */
export function startDealAlertScheduler() {
  console.log(`[DealAlertScheduler] Starting — will run every ${INTERVAL_MS / 3600000}h`);

  // Run once after a 2-minute delay on startup (to let DB connections settle)
  const startupDelay = setTimeout(async () => {
    await runScheduledAnalysis();
  }, 2 * 60 * 1000);

  // Then run every 6 hours
  schedulerTimer = setInterval(async () => {
    await runScheduledAnalysis();
  }, INTERVAL_MS);

  // Cleanup on process exit
  process.on("beforeExit", () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    clearTimeout(startupDelay);
  });
}

/**
 * Manually trigger analysis for a specific tenant (used by the "Run Analysis" button).
 * Returns the new alerts with notifications already created.
 */
export async function triggerDealAnalysisForTenant(tenantId: string, userId: string): Promise<{
  alertsCreated: number;
  notificationsCreated: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await runDealIntelligence(tenantId);

  if (result.alertsCreated === 0) {
    return { alertsCreated: 0, notificationsCreated: 0 };
  }

  // Get the newly created alerts
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const newAlerts = await db.select()
    .from(dealIntelligenceAlerts)
    .where(and(
      eq(dealIntelligenceAlerts.tenantId, tenantId),
      gt(dealIntelligenceAlerts.createdAt, fiveMinutesAgo),
    ))
    .limit(20);

  let notificationsCreated = 0;
  const prefs = await getUserNotificationPrefs(userId);

  for (const alert of newAlerts) {
    if (!prefs.inAppEnabled) continue;

    const actionUrl = alert.dealId
      ? `${process.env.APP_URL || "https://www.crmneurovitality.com"}/deals/${alert.dealId}`
      : undefined;

    await createNotification({
      tenantId,
      userId,
      type: "deal_alert",
      title: alert.title || "Deal Intelligence Alert",
      body: alert.description || "",
      severity: (alert.severity || "medium") as any,
      entityType: "deal",
      entityId: alert.dealId || undefined,
      entityName: alert.dealName || undefined,
      actionUrl,
      sendEmail: prefs.emailEnabled,
      userEmail: prefs.email || undefined,
      userName: prefs.name,
    });
    notificationsCreated++;
  }

  return { alertsCreated: result.alertsCreated, notificationsCreated };
}
