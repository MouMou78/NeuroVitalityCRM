/**
 * dealIntelligenceEngine.ts
 *
 * Proactive AI deal intelligence — analyses all open deals and generates
 * unprompted alerts for:
 *   - drift (deal going cold / no activity)
 *   - momentum (deal accelerating, likely to close won)
 *   - at_risk (patterns matching previously lost deals)
 *   - likely_won (strong positive signals)
 *   - likely_lost (strong negative signals)
 *   - stale (no stage movement in too long)
 *   - follow_up_overdue (expected close date passed, no update)
 *   - pattern_match (matches a known won/lost pattern from knowledge vault)
 *
 * Runs on demand (triggered by cron or manual refresh) and stores alerts
 * in the dealIntelligenceAlerts table. Alerts are surfaced in the dashboard
 * and on individual deal pages.
 */

import { db } from "./db";
import { deals, dealStages, dealIntelligenceAlerts, aiMemory } from "../drizzle/schema";
import { eq, and, isNull, not, lt, gt, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { OpenAI } from "openai";
import { getDealsByTenant, getDealStagesByTenant } from "./db-deals";

const openai = new OpenAI();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DealWithContext {
  id: string;
  name: string;
  value: string | null;
  stageId: string;
  stageName?: string;
  stageOrder?: number;
  accountId: string | null;
  contactId: string | null;
  ownerUserId: string | null;
  expectedCloseDate: Date | null;
  probability: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  daysSinceUpdate: number;
  daysUntilClose: number | null;
  isOverdue: boolean;
}

interface AlertCandidate {
  dealId: string;
  dealName: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendation: string;
  confidence: number;
  patternData: Record<string, any>;
}

// ─────────────────────────────────────────────
// Pattern detection (rule-based, fast)
// ─────────────────────────────────────────────

function detectRuleBasedAlerts(deal: DealWithContext): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  const now = new Date();

  // 1. Stale deal — no update in 14+ days
  if (deal.daysSinceUpdate >= 14) {
    const severity = deal.daysSinceUpdate >= 30 ? "high" : deal.daysSinceUpdate >= 21 ? "medium" : "low";
    alerts.push({
      dealId: deal.id,
      dealName: deal.name,
      alertType: "stale",
      severity,
      message: `"${deal.name}" has had no activity for ${deal.daysSinceUpdate} days.`,
      recommendation: `Schedule a touchpoint or update the deal status. If stalled, consider a re-engagement sequence.`,
      confidence: 95,
      patternData: { daysSinceUpdate: deal.daysSinceUpdate, stageId: deal.stageId },
    });
  }

  // 2. Follow-up overdue — close date passed
  if (deal.isOverdue && deal.daysUntilClose !== null) {
    const daysOverdue = Math.abs(deal.daysUntilClose);
    const severity = daysOverdue >= 14 ? "critical" : daysOverdue >= 7 ? "high" : "medium";
    alerts.push({
      dealId: deal.id,
      dealName: deal.name,
      alertType: "follow_up_overdue",
      severity,
      message: `"${deal.name}" expected close date passed ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} ago.`,
      recommendation: `Update the expected close date or move to a lost/stalled stage. Contact the prospect to understand their timeline.`,
      confidence: 98,
      patternData: { daysOverdue, expectedCloseDate: deal.expectedCloseDate },
    });
  }

  // 3. Momentum — closing soon with high probability
  if (deal.daysUntilClose !== null && deal.daysUntilClose >= 0 && deal.daysUntilClose <= 7 && (deal.probability || 0) >= 70) {
    alerts.push({
      dealId: deal.id,
      dealName: deal.name,
      alertType: "momentum",
      severity: "high",
      message: `"${deal.name}" is due to close in ${deal.daysUntilClose} day${deal.daysUntilClose !== 1 ? "s" : ""} with ${deal.probability}% probability.`,
      recommendation: `Prioritise this deal. Confirm next steps with the prospect and prepare the contract/proposal if not already done.`,
      confidence: 85,
      patternData: { daysUntilClose: deal.daysUntilClose, probability: deal.probability },
    });
  }

  // 4. At risk — close date approaching but low probability
  if (deal.daysUntilClose !== null && deal.daysUntilClose >= 0 && deal.daysUntilClose <= 14 && (deal.probability || 0) < 40) {
    alerts.push({
      dealId: deal.id,
      dealName: deal.name,
      alertType: "at_risk",
      severity: "high",
      message: `"${deal.name}" closes in ${deal.daysUntilClose} days but probability is only ${deal.probability}%.`,
      recommendation: `Identify the blockers. Consider a direct conversation with the decision maker or a revised offer.`,
      confidence: 80,
      patternData: { daysUntilClose: deal.daysUntilClose, probability: deal.probability },
    });
  }

  // 5. Drift — probability dropped significantly (inferred from low probability + recent update)
  if ((deal.probability || 0) <= 20 && deal.daysSinceUpdate <= 3) {
    alerts.push({
      dealId: deal.id,
      dealName: deal.name,
      alertType: "drift",
      severity: "medium",
      message: `"${deal.name}" has a low probability (${deal.probability}%) — may be drifting towards lost.`,
      recommendation: `Review the deal notes and recent interactions. Consider whether to re-qualify or escalate.`,
      confidence: 70,
      patternData: { probability: deal.probability, daysSinceUpdate: deal.daysSinceUpdate },
    });
  }

  return alerts;
}

// ─────────────────────────────────────────────
// AI-powered pattern analysis (deeper insights)
// ─────────────────────────────────────────────

async function analyseDealsWithAI(params: {
  tenantId: string;
  deals: DealWithContext[];
  existingMemories: string[];
}): Promise<AlertCandidate[]> {
  const { deals: dealList, existingMemories } = params;

  if (dealList.length === 0) return [];

  const dealsContext = dealList.map(d => ({
    id: d.id,
    name: d.name,
    value: d.value,
    stage: d.stageName || d.stageId,
    probability: d.probability,
    daysSinceUpdate: d.daysSinceUpdate,
    daysUntilClose: d.daysUntilClose,
    isOverdue: d.isOverdue,
    notes: d.notes?.slice(0, 300) || null,
  }));

  const memoriesContext = existingMemories.length > 0
    ? `\nKnown patterns from past deals:\n${existingMemories.slice(0, 20).map(m => `- ${m}`).join("\n")}`
    : "";

  const prompt = `You are a sales intelligence AI analysing a CRM pipeline for patterns, risks, and opportunities.

Current open deals:
${JSON.stringify(dealsContext, null, 2)}
${memoriesContext}

Identify deals that show:
1. Strong momentum signals (likely to close won soon)
2. Risk patterns matching previously lost deals
3. Unusual patterns worth flagging

For each insight, provide a specific, actionable alert. Focus on deals NOT already covered by simple rules (stale, overdue).

Respond with JSON array (max 5 AI-generated alerts):
[
  {
    "dealId": "...",
    "dealName": "...",
    "alertType": "likely_won|likely_lost|pattern_match|competitor_risk|momentum",
    "severity": "low|medium|high|critical",
    "message": "Specific observation about this deal",
    "recommendation": "Specific action to take",
    "confidence": 75,
    "patternData": {}
  }
]

If no meaningful AI insights beyond the rules, return an empty array [].`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const parsed = JSON.parse(content);
    const alerts = Array.isArray(parsed) ? parsed : (parsed.alerts || []);

    return alerts.filter((a: any) => a.dealId && a.message).map((a: any) => ({
      dealId: a.dealId,
      dealName: a.dealName || "",
      alertType: a.alertType || "pattern_match",
      severity: (["low", "medium", "high", "critical"].includes(a.severity) ? a.severity : "medium") as any,
      message: a.message,
      recommendation: a.recommendation || "",
      confidence: Math.min(100, Math.max(0, Number(a.confidence) || 70)),
      patternData: a.patternData || {},
    }));
  } catch (err) {
    console.error("AI deal analysis error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────
// Deduplication — don't re-create alerts that already exist
// ─────────────────────────────────────────────

async function getExistingAlertKeys(tenantId: string): Promise<Set<string>> {
  const existing = await db.select({
    dealId: dealIntelligenceAlerts.dealId,
    alertType: dealIntelligenceAlerts.alertType,
  })
    .from(dealIntelligenceAlerts)
    .where(and(
      eq(dealIntelligenceAlerts.tenantId, tenantId),
      eq(dealIntelligenceAlerts.isDismissed, false),
      eq(dealIntelligenceAlerts.isRead, false),
    ));

  return new Set(existing.map(e => `${e.dealId}:${e.alertType}`));
}

// ─────────────────────────────────────────────
// Main engine entry point
// ─────────────────────────────────────────────

export async function runDealIntelligence(tenantId: string): Promise<{
  alertsCreated: number;
  alertsFound: number;
}> {
  const now = new Date();

  // 1. Load all open deals
  const rawDeals = await getDealsByTenant(tenantId);
  const stages = await getDealStagesByTenant(tenantId);
  const stageMap = new Map(stages.map(s => [s.id, s]));

  // Filter to open deals only (not won/lost stages)
  const wonLostStageNames = ["won", "closed won", "lost", "closed lost", "dead"];
  const openDeals = rawDeals.filter(d => {
    const stage = stageMap.get(d.stageId);
    return !wonLostStageNames.includes(stage?.name?.toLowerCase() || "");
  });

  if (openDeals.length === 0) return { alertsCreated: 0, alertsFound: 0 };

  // 2. Enrich with computed fields
  const enrichedDeals: DealWithContext[] = openDeals.map(d => {
    const stage = stageMap.get(d.stageId);
    const updatedAt = new Date(d.updatedAt);
    const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    let daysUntilClose: number | null = null;
    let isOverdue = false;
    if (d.expectedCloseDate) {
      const closeDate = new Date(d.expectedCloseDate);
      daysUntilClose = Math.floor((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilClose < 0;
    }

    return {
      id: d.id,
      name: d.name,
      value: d.value,
      stageId: d.stageId,
      stageName: stage?.name,
      stageOrder: stage?.order,
      accountId: d.accountId,
      contactId: d.contactId,
      ownerUserId: d.ownerUserId,
      expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
      probability: d.probability,
      notes: d.notes,
      createdAt: new Date(d.createdAt),
      updatedAt,
      daysSinceUpdate,
      daysUntilClose,
      isOverdue,
    };
  });

  // 3. Load existing alert keys to avoid duplicates
  const existingKeys = await getExistingAlertKeys(tenantId);

  // 4. Load relevant AI memories for pattern matching
  const memories = await db.select({ content: aiMemory.content })
    .from(aiMemory)
    .where(and(
      eq(aiMemory.tenantId, tenantId),
      // Only deal-related memories
    ));
  const dealMemories = memories
    .filter(m => m.content.toLowerCase().includes("deal") || m.content.toLowerCase().includes("close") || m.content.toLowerCase().includes("won") || m.content.toLowerCase().includes("lost"))
    .map(m => m.content);

  // 5. Rule-based detection
  const ruleAlerts: AlertCandidate[] = [];
  for (const deal of enrichedDeals) {
    const alerts = detectRuleBasedAlerts(deal);
    ruleAlerts.push(...alerts);
  }

  // 6. AI-powered analysis (only for deals without rule alerts, or high-value deals)
  const dealsForAI = enrichedDeals.filter(d => {
    const hasRuleAlert = ruleAlerts.some(a => a.dealId === d.id);
    const isHighValue = parseFloat(d.value || "0") > 10000;
    return !hasRuleAlert || isHighValue;
  }).slice(0, 20); // Cap at 20 deals for AI analysis

  const aiAlerts = await analyseDealsWithAI({
    tenantId,
    deals: dealsForAI,
    existingMemories: dealMemories,
  });

  // 7. Combine and deduplicate
  const allAlerts = [...ruleAlerts, ...aiAlerts];
  const newAlerts = allAlerts.filter(a => !existingKeys.has(`${a.dealId}:${a.alertType}`));

  // 8. Store new alerts
  let alertsCreated = 0;
  for (const alert of newAlerts) {
    try {
      await db.insert(dealIntelligenceAlerts).values({
        id: randomUUID(),
        tenantId,
        dealId: alert.dealId,
        dealName: alert.dealName,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        recommendation: alert.recommendation,
        confidence: alert.confidence,
        patternData: JSON.stringify(alert.patternData),
        isRead: false,
        isDismissed: false,
        actionTaken: false,
        // Alerts expire after 7 days if not acted on
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
      alertsCreated++;
    } catch (err) {
      console.error("Failed to insert alert:", err);
    }
  }

  // 9. Clean up expired alerts
  try {
    await db.delete(dealIntelligenceAlerts)
      .where(and(
        eq(dealIntelligenceAlerts.tenantId, tenantId),
        lt(dealIntelligenceAlerts.expiresAt, now),
      ));
  } catch { /* non-critical */ }

  return { alertsCreated, alertsFound: allAlerts.length };
}

// ─────────────────────────────────────────────
// Fetch alerts for display
// ─────────────────────────────────────────────

export async function getDealAlerts(tenantId: string, filters?: {
  unreadOnly?: boolean;
  dealId?: string;
  severity?: string;
}) {
  const allAlerts = await db.select()
    .from(dealIntelligenceAlerts)
    .where(and(
      eq(dealIntelligenceAlerts.tenantId, tenantId),
      eq(dealIntelligenceAlerts.isDismissed, false),
    ))
    .orderBy(dealIntelligenceAlerts.createdAt);

  let results = allAlerts;

  if (filters?.unreadOnly) {
    results = results.filter(a => !a.isRead);
  }
  if (filters?.dealId) {
    results = results.filter(a => a.dealId === filters.dealId);
  }
  if (filters?.severity) {
    results = results.filter(a => a.severity === filters.severity);
  }

  return results.map(a => ({
    ...a,
    patternData: a.patternData ? JSON.parse(a.patternData) : {},
  }));
}

export async function markAlertRead(alertId: string, tenantId: string): Promise<void> {
  await db.update(dealIntelligenceAlerts)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(
      eq(dealIntelligenceAlerts.id, alertId),
      eq(dealIntelligenceAlerts.tenantId, tenantId),
    ));
}

export async function dismissAlert(alertId: string, tenantId: string): Promise<void> {
  await db.update(dealIntelligenceAlerts)
    .set({ isDismissed: true, updatedAt: new Date() })
    .where(and(
      eq(dealIntelligenceAlerts.id, alertId),
      eq(dealIntelligenceAlerts.tenantId, tenantId),
    ));
}

export async function markAlertActioned(alertId: string, tenantId: string, note?: string): Promise<void> {
  await db.update(dealIntelligenceAlerts)
    .set({ actionTaken: true, actionNote: note || null, isRead: true, updatedAt: new Date() })
    .where(and(
      eq(dealIntelligenceAlerts.id, alertId),
      eq(dealIntelligenceAlerts.tenantId, tenantId),
    ));
}

export async function getAlertSummaryForAI(tenantId: string): Promise<string> {
  try {
    const alerts = await getDealAlerts(tenantId, { unreadOnly: true });
    if (alerts.length === 0) return "";

    const lines = alerts.slice(0, 10).map(a =>
      `- [${a.severity.toUpperCase()}] ${a.alertType}: ${a.message}`
    );

    return `\n## Active Deal Intelligence Alerts (${alerts.length} unread)\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}
