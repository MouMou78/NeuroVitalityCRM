/**
 * Lead Scoring Engine
 *
 * Rule-based scoring with time-decay. Score changes are persisted and can
 * trigger workflow branches automatically via the Workflow Engine.
 *
 * Scoring rules:
 *   email_opened            +5  (first open), +10 (multiple opens same email)
 *   email_clicked           +20
 *   page_visit (pricing)    +30
 *   form_submitted          +60
 *   email_replied (positive)+75
 *   email_unsubscribed      -50
 *   explicit_not_interested -100
 *
 * Decay: -10% every 30 days of inactivity.
 *
 * Score tiers:
 *   0–20   Cold
 *   21–60  Warm
 *   61–120 Hot
 *   121+   Sales Ready
 */

import { getDb } from "../db";
import { engineLeadScores as leadScores } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { EventType } from "./eventIngestion";

export type ScoreTier = "cold" | "warm" | "hot" | "sales_ready";

const SCORING_RULES: Partial<Record<EventType, number>> = {
  email_opened: 5,
  email_clicked: 20,
  form_submitted: 60,
  email_replied: 75,
  email_unsubscribed: -50,
};

const PRICING_PAGE_BONUS = 30;
const MULTIPLE_OPEN_BONUS = 10; // extra if same email opened more than once
const DECAY_RATE = 0.10; // 10% per 30 days
const DECAY_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function scoreTier(score: number): ScoreTier {
  if (score <= 20) return "cold";
  if (score <= 60) return "warm";
  if (score <= 120) return "hot";
  return "sales_ready";
}

/**
 * Get the current score for a lead, applying time-decay since last activity.
 */
export async function getLeadScore(tenant_id: string, entity_id: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select()
    .from(leadScores)
    .where(and(eq(leadScores.tenant_id, tenant_id), eq(leadScores.entity_id, entity_id)))
    .limit(1);

  if (rows.length === 0) return 0;

  const row = rows[0];
  const rawScore = row.score ?? 0;
  const lastActivity = row.last_activity_at ? new Date(row.last_activity_at) : new Date();
  const daysSinceActivity = (Date.now() - lastActivity.getTime()) / DECAY_PERIOD_MS;
  const decayedScore = rawScore * Math.pow(1 - DECAY_RATE, daysSinceActivity);

  return Math.max(0, Math.round(decayedScore));
}

/**
 * Apply a score delta for an event, persist the new score, and return the
 * updated score and tier. Returns null if the event has no scoring rule.
 */
export async function applyScoreEvent(
  tenant_id: string,
  entity_id: string,
  event_type: EventType,
  payload?: Record<string, any>
): Promise<{ score: number; tier: ScoreTier; delta: number } | null> {
  let delta = SCORING_RULES[event_type] ?? 0;

  // Bonus for pricing page visits
  if (event_type === "page_visit" && payload?.page === "pricing") {
    delta = PRICING_PAGE_BONUS;
  }

  // Bonus for multiple opens of the same email
  if (event_type === "email_opened" && payload?.is_repeat_open) {
    delta = MULTIPLE_OPEN_BONUS;
  }

  // Manual score adjustment
  if (event_type === "score_adjustment" && typeof payload?.delta === "number") {
    delta = payload.delta;
  }

  if (delta === 0) return null;

  const db = await getDb();
  if (!db) return null;

  const currentScore = await getLeadScore(tenant_id, entity_id);
  const newScore = Math.max(0, currentScore + delta);
  const tier = scoreTier(newScore);
  const now = new Date();

  const existing = await db
    .select({ id: leadScores.id })
    .from(leadScores)
    .where(and(eq(leadScores.tenant_id, tenant_id), eq(leadScores.entity_id, entity_id)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leadScores)
      .set({ score: newScore, tier, last_activity_at: now, updated_at: now })
      .where(eq(leadScores.id, existing[0].id));
  } else {
    await db.insert(leadScores).values({
      id: randomUUID(),
      tenant_id,
      entity_id,
      score: newScore,
      tier,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  console.log(`[LeadScoring] ${entity_id}: ${currentScore} → ${newScore} (${delta > 0 ? "+" : ""}${delta}) tier=${tier}`);
  return { score: newScore, tier, delta };
}
