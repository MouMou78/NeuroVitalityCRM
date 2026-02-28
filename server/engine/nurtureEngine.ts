/**
 * Nurture Engine
 *
 * Routes leads into long-term nurture workflows after they complete a primary
 * sequence without converting. Handles content rotation, re-entry triggers,
 * and archival after 12 months of inactivity.
 *
 * Entry conditions:
 *   - Completed primary sequence
 *   - Not unsubscribed
 *   - No explicit negative reply
 *   - No deal created
 *
 * Cadence: every 30–45 days (randomised to avoid send-day clustering)
 *
 * Re-entry triggers:
 *   - Click in nurture email
 *   - Website revisit (page_visit event)
 *   - Manual tag
 *   - Score crosses 60 (Warm → Hot transition)
 *
 * Archive: after 12 months of inactivity, mark as archived.
 */

import { getDb } from "../db";
import { nurtureEnrollments, suppressionList } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getLeadScore, scoreTier } from "./leadScoring";
import { enrollLead } from "./workflowEngine";

const NURTURE_CADENCE_MIN_DAYS = 30;
const NURTURE_CADENCE_MAX_DAYS = 45;
const ARCHIVE_AFTER_MS = 12 * 30 * 24 * 60 * 60 * 1000; // ~12 months

function randomCadenceDays(): number {
  return Math.floor(
    NURTURE_CADENCE_MIN_DAYS +
      Math.random() * (NURTURE_CADENCE_MAX_DAYS - NURTURE_CADENCE_MIN_DAYS)
  );
}

/**
 * Attempt to enrol a lead into the nurture track. Checks all entry conditions
 * before enrolling. Returns true if enrolled.
 */
export async function tryEnrolInNurture(
  tenant_id: string,
  entity_id: string,
  nurture_workflow_id: string,
  options?: {
    has_deal?: boolean;
    explicit_negative?: boolean;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Check suppression
  const suppressed = await db
    .select({ id: suppressionList.id })
    .from(suppressionList)
    .where(
      and(
        eq(suppressionList.tenant_id, tenant_id),
        eq(suppressionList.email, entity_id) // entity_id may be email in this context
      )
    )
    .limit(1);

  if (suppressed.length > 0) {
    console.log(`[NurtureEngine] ${entity_id} is suppressed — skipping nurture enrolment`);
    return false;
  }

  if (options?.has_deal) {
    console.log(`[NurtureEngine] ${entity_id} has an open deal — skipping nurture`);
    return false;
  }

  if (options?.explicit_negative) {
    console.log(`[NurtureEngine] ${entity_id} has explicit negative — skipping nurture`);
    return false;
  }

  // Check for existing active nurture enrollment
  const existing = await db
    .select({ id: nurtureEnrollments.id })
    .from(nurtureEnrollments)
    .where(
      and(
        eq(nurtureEnrollments.tenant_id, tenant_id),
        eq(nurtureEnrollments.entity_id, entity_id),
        eq(nurtureEnrollments.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log(`[NurtureEngine] ${entity_id} already in nurture`);
    return false;
  }

  const nextSendAt = new Date(Date.now() + randomCadenceDays() * 24 * 60 * 60 * 1000);

  await db.insert(nurtureEnrollments).values({
    id: randomUUID(),
    tenant_id,
    entity_id,
    nurture_workflow_id,
    status: "active",
    next_send_at: nextSendAt,
    content_index: 0,
    enrolled_at: new Date(),
    last_activity_at: new Date(),
  });

  // Also enrol in the workflow engine
  await enrollLead(tenant_id, nurture_workflow_id, entity_id);

  console.log(`[NurtureEngine] Enrolled ${entity_id} in nurture — next send ${nextSendAt.toISOString()}`);
  return true;
}

/**
 * Check re-entry triggers for a lead. If the lead's score crosses 60 or they
 * click a nurture email, re-enrol them in the primary workflow.
 */
export async function checkReEntryTriggers(
  tenant_id: string,
  entity_id: string,
  primary_workflow_id: string,
  trigger_event?: string
): Promise<boolean> {
  const score = await getLeadScore(tenant_id, entity_id);
  const tier = scoreTier(score);

  const reEntryTriggers = ["email_clicked", "page_visit", "manual_tag"];
  const scoreTriggered = score >= 60 && tier !== "cold";
  const eventTriggered = trigger_event ? reEntryTriggers.includes(trigger_event) : false;

  if (scoreTriggered || eventTriggered) {
    console.log(`[NurtureEngine] Re-entry triggered for ${entity_id} (score=${score}, event=${trigger_event})`);
    await enrollLead(tenant_id, primary_workflow_id, entity_id);
    return true;
  }

  return false;
}

/**
 * Archive nurture enrollments that have had no activity for 12 months.
 * Called by the daily scheduler cron.
 */
export async function archiveInactiveNurtureLeads(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_MS);

  const active = await db
    .select()
    .from(nurtureEnrollments)
    .where(eq(nurtureEnrollments.status, "active"));

  let archived = 0;
  for (const row of active) {
    const lastActivity = row.last_activity_at ? new Date(row.last_activity_at) : new Date(row.enrolled_at);
    if (lastActivity < cutoff) {
      await db
        .update(nurtureEnrollments)
        .set({ status: "archived" })
        .where(eq(nurtureEnrollments.id, row.id));
      archived++;
      console.log(`[NurtureEngine] Archived inactive lead ${row.entity_id}`);
    }
  }

  if (archived > 0) {
    console.log(`[NurtureEngine] Archived ${archived} inactive nurture leads`);
  }

  return archived;
}
