/**
 * Lead Scoring Engine
 * Implements fit and intent scoring based on the CRM scoring blueprint
 */

import type { Person, Account } from "../drizzle/schema";

// Scoring configuration from blueprint
const FIT_SCORING_RULES = [
  {
    ruleId: "fit.industry_target",
    description: "Industry matches target list",
    checkAccount: (account: Partial<Account>) => 
      ["SaaS", "B2B Software", "Technology"].includes(account.industry || ""),
    checkPerson: () => false,
    points: 25,
    reason: "Target industry",
  },
  {
    ruleId: "fit.employee_band_ideal",
    description: "Employee band in ideal range",
    checkAccount: (account: Partial<Account>) =>
      ["51-200", "201-500", "501-1000"].includes(account.employees || ""),
    checkPerson: () => false,
    points: 20,
    reason: "Ideal company size",
  },
  {
    ruleId: "fit.region_priority",
    description: "Region is a priority market",
    checkAccount: () => false,
    checkPerson: (person: Partial<Person>) =>
      ["UK&I", "Western Europe", "North America"].includes(person.region || ""),
    points: 10,
    reason: "Priority region",
  },
  {
    ruleId: "fit.seniority_decision_maker",
    description: "Contact seniority indicates decision maker",
    checkAccount: () => false,
    checkPerson: (person: Partial<Person>) =>
      ["C-Level", "VP", "Director"].includes(person.seniority || ""),
    points: 15,
    reason: "Decision maker seniority",
  },
];

// Tier thresholds from blueprint
const FIT_TIER_RULES = [
  { tier: "A" as const, minScore: 70 },
  { tier: "B" as const, minScore: 40 },
  { tier: "C" as const, minScore: 0 },
];

const INTENT_TIER_RULES = [
  { tier: "Hot" as const, minScore: 60 },
  { tier: "Warm" as const, minScore: 25 },
  { tier: "Cold" as const, minScore: 0 },
];

// Event scoring from blueprint
const EVENT_POINTS: Record<string, number> = {
  // Email events
  "email_sent": 0,
  "email_opened": 1,
  "email_clicked": 5,
  "email_replied": 15,
  
  // Website events
  "page_view": 1,
  "pricing_view": 8,
  "demo_request": 20,
  "content_download": 6,
  "webinar_registration": 15,
  "trial_started": 25,
  
  // Legacy dotted format for backwards compatibility
  "website.page_view": 1,
  "website.pricing_view": 8,
  "website.demo_view": 6,
  "website.form_submit_demo": 20,
  "product.account_created": 10,
  "product.activation_milestone": 25,
  "product.key_feature_used": 12,
  "marketing.email_open": 1,
  "marketing.email_click": 5,
  "marketing.webinar_attended": 15,
  "sales.meeting_booked": 25,
  "sales.call_completed": 5,
};

/**
 * Calculate fit score for a person and their account
 */
export function calculateFitScore(
  person: Partial<Person>,
  account: Partial<Account> | null
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of FIT_SCORING_RULES) {
    let matches = false;
    
    if (account && rule.checkAccount(account)) {
      matches = true;
    }
    
    if (rule.checkPerson(person)) {
      matches = true;
    }

    if (matches) {
      score += rule.points;
      reasons.push(rule.reason);
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  return { score, reasons };
}

/**
 * Calculate intent score based on recent events with decay
 * Uses exponential decay with 21-day half-life from blueprint
 */
export function calculateIntentScore(
  events: Array<{ type: string; timestamp: Date }>
): { score: number; reasons: string[] } {
  const now = Date.now();
  const HALF_LIFE_MS = 21 * 24 * 60 * 60 * 1000; // 21 days from blueprint
  const MIN_DECAY = 0.1; // from blueprint

  let score = 0;
  const reasons: string[] = [];
  const eventCounts: Record<string, number> = {};

  for (const event of events) {
    const points = EVENT_POINTS[event.type] || 0;
    if (points === 0) continue;

    // Calculate decay based on age
    const ageMs = now - event.timestamp.getTime();
    const decayFactor = Math.max(
      MIN_DECAY,
      Math.pow(0.5, ageMs / HALF_LIFE_MS)
    );

    score += points * decayFactor;
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  // Generate reasons from most frequent events
  const sortedEvents = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  for (const [eventType, count] of sortedEvents) {
    const displayName = eventType.replace(/^(website|product|marketing|sales)\./, '');
    reasons.push(`${displayName} (${count}x)`);
  }

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  return { score, reasons };
}

/**
 * Calculate combined score (60% fit, 40% intent) from blueprint
 */
export function calculateCombinedScore(
  fitScore: number,
  intentScore: number
): number {
  return Math.round(fitScore * 0.6 + intentScore * 0.4);
}

/**
 * Determine fit tier based on score (from blueprint)
 */
export function calculateFitTier(score: number): "A" | "B" | "C" {
  for (const rule of FIT_TIER_RULES) {
    if (score >= rule.minScore) {
      return rule.tier;
    }
  }
  return "C";
}

/**
 * Determine intent tier based on score (from blueprint)
 */
export function calculateIntentTier(score: number): "Hot" | "Warm" | "Cold" {
  for (const rule of INTENT_TIER_RULES) {
    if (score >= rule.minScore) {
      return rule.tier;
    }
  }
  return "Cold";
}

/**
 * Calculate all scores for a person
 */
export async function scoreContact(
  person: Partial<Person>,
  account: Partial<Account> | null,
  events: Array<{ type: string; timestamp: Date }> = []
): Promise<{
  fitScore: number;
  intentScore: number;
  combinedScore: number;
  fitTier: "A" | "B" | "C";
  intentTier: "Hot" | "Warm" | "Cold";
  scoreReasons: string[];
}> {
  const { score: fitScore, reasons: fitReasons } = calculateFitScore(person, account);
  const { score: intentScore, reasons: intentReasons } = calculateIntentScore(events);
  const combinedScore = calculateCombinedScore(fitScore, intentScore);
  const fitTier = calculateFitTier(fitScore);
  const intentTier = calculateIntentTier(intentScore);

  const scoreReasons = [
    ...fitReasons.map(r => `Fit: ${r}`),
    ...intentReasons.map(r => `Intent: ${r}`),
  ];

  return {
    fitScore,
    intentScore,
    combinedScore,
    fitTier,
    intentTier,
    scoreReasons,
  };
}
