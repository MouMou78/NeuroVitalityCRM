/**
 * Suppression & Compliance Layer
 *
 * All send actions MUST pass through this layer before execution.
 * Suppression rules:
 *   - Hard bounce → permanent global suppression
 *   - Spam complaint → global suppression
 *   - Unsubscribe → global suppression
 *   - Frequency cap: max N emails per contact per rolling 7-day window
 *   - Domain-level throttling: max N emails per domain per hour
 *   - Manual suppression with optional expiry (e.g., suppress 180 days)
 */

import { getDb } from "../db";
import { suppressionList, crmEvents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export type SuppressionReason =
  | "hard_bounce"
  | "spam_complaint"
  | "unsubscribed"
  | "manual"
  | "frequency_cap"
  | "domain_throttle";

export interface SuppressionCheck {
  suppressed: boolean;
  reason?: SuppressionReason;
  expires_at?: Date;
}

const FREQUENCY_CAP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FREQUENCY_CAP_MAX = 5; // max emails per contact per 7-day window
const DOMAIN_THROTTLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DOMAIN_THROTTLE_MAX = 50; // max emails per domain per hour

/**
 * Check whether a contact email is suppressed. Must be called before every
 * send action. Returns suppressed=true with the reason if blocked.
 */
export async function checkSuppression(
  tenant_id: string,
  email: string
): Promise<SuppressionCheck> {
  const db = await getDb();
  if (!db) return { suppressed: false };

  const domain = email.split("@")[1]?.toLowerCase();
  const now = new Date();

  // 1. Global suppression list (hard bounce, spam, unsubscribe, manual)
  const globalRows = await db
    .select()
    .from(suppressionList)
    .where(
      and(
        eq(suppressionList.tenant_id, tenant_id),
        eq(suppressionList.email, email.toLowerCase())
      )
    )
    .limit(1);

  if (globalRows.length > 0) {
    const row = globalRows[0];
    // Check if suppression has expired
    if (!row.expires_at || new Date(row.expires_at) > now) {
      return {
        suppressed: true,
        reason: row.reason as SuppressionReason,
        expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
      };
    }
    // Expired — remove the suppression
    await db.delete(suppressionList).where(eq(suppressionList.id, row.id));
  }

  // 2. Frequency cap — count recent sends to this email
  const recentSends = await db
    .select({ event_id: crmEvents.event_id })
    .from(crmEvents)
    .where(
      and(
        eq(crmEvents.tenant_id, tenant_id),
        eq(crmEvents.event_type, "email_sent")
      )
    );

  const windowStart = new Date(Date.now() - FREQUENCY_CAP_WINDOW_MS);
  const recentToContact = recentSends.filter((r: any) => {
    const payload = r.payload as any;
    return payload?.to === email && new Date(r.occurred_at ?? 0) >= windowStart;
  });

  if (recentToContact.length >= FREQUENCY_CAP_MAX) {
    return { suppressed: true, reason: "frequency_cap" };
  }

  // 3. Domain throttle — count recent sends to this domain in the last hour
  if (domain) {
    const domainWindowStart = new Date(Date.now() - DOMAIN_THROTTLE_WINDOW_MS);
    const recentToDomain = recentSends.filter((r: any) => {
      const payload = r.payload as any;
      const toDomain = payload?.to?.split("@")[1]?.toLowerCase();
      return toDomain === domain && new Date(r.occurred_at ?? 0) >= domainWindowStart;
    });

    if (recentToDomain.length >= DOMAIN_THROTTLE_MAX) {
      return { suppressed: true, reason: "domain_throttle" };
    }
  }

  return { suppressed: false };
}

/**
 * Add an email address to the suppression list.
 */
export async function suppressEmail(
  tenant_id: string,
  email: string,
  reason: SuppressionReason,
  expires_at?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: suppressionList.id })
    .from(suppressionList)
    .where(
      and(
        eq(suppressionList.tenant_id, tenant_id),
        eq(suppressionList.email, email.toLowerCase())
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(suppressionList)
      .set({ reason, expires_at: expires_at ?? null, updated_at: new Date() })
      .where(eq(suppressionList.id, existing[0].id));
  } else {
    await db.insert(suppressionList).values({
      id: randomUUID(),
      tenant_id,
      email: email.toLowerCase(),
      reason,
      expires_at: expires_at ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log(`[Suppression] Suppressed ${email} (${reason})${expires_at ? ` until ${expires_at.toISOString()}` : " permanently"}`);
}

/**
 * Remove an email from the suppression list (e.g., after re-opt-in).
 */
export async function unsuppressEmail(tenant_id: string, email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(suppressionList)
    .where(
      and(
        eq(suppressionList.tenant_id, tenant_id),
        eq(suppressionList.email, email.toLowerCase())
      )
    );

  console.log(`[Suppression] Removed suppression for ${email}`);
}
