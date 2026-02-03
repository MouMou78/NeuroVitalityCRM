/**
 * Contact Engagement Scoring System
 * 
 * Calculates engagement scores based on various signals:
 * - Email opens: +5 points each
 * - Email replies: +20 points each
 * - Meetings booked: +50 points
 * - Link clicks: +10 points each
 * - Recent activity (last 7 days): 2x multiplier
 * - Recent activity (last 30 days): 1.5x multiplier
 */

interface EngagementSignals {
  emailOpens: number;
  emailReplies: number;
  meetingsBooked: number;
  linkClicks: number;
  lastActivityDate?: Date;
}

const SCORING_WEIGHTS = {
  EMAIL_OPEN: 5,
  EMAIL_REPLY: 20,
  MEETING_BOOKED: 50,
  LINK_CLICK: 10,
};

const RECENCY_MULTIPLIERS = {
  LAST_7_DAYS: 2.0,
  LAST_30_DAYS: 1.5,
  OLDER: 1.0,
};

export function calculateEngagementScore(signals: EngagementSignals): number {
  let baseScore = 0;

  // Calculate base score from engagement signals
  baseScore += signals.emailOpens * SCORING_WEIGHTS.EMAIL_OPEN;
  baseScore += signals.emailReplies * SCORING_WEIGHTS.EMAIL_REPLY;
  baseScore += (signals.meetingsBooked ? 1 : 0) * SCORING_WEIGHTS.MEETING_BOOKED;
  baseScore += signals.linkClicks * SCORING_WEIGHTS.LINK_CLICK;

  // Apply recency multiplier
  let multiplier = RECENCY_MULTIPLIERS.OLDER;
  if (signals.lastActivityDate) {
    const daysSinceActivity = Math.floor(
      (Date.now() - signals.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity <= 7) {
      multiplier = RECENCY_MULTIPLIERS.LAST_7_DAYS;
    } else if (daysSinceActivity <= 30) {
      multiplier = RECENCY_MULTIPLIERS.LAST_30_DAYS;
    }
  }

  return Math.round(baseScore * multiplier);
}

export function getScoreLabel(score: number): string {
  if (score >= 200) return "Hot";
  if (score >= 100) return "Warm";
  if (score >= 50) return "Engaged";
  if (score >= 20) return "Active";
  return "Cold";
}

export function getScoreColor(score: number): string {
  if (score >= 200) return "red";
  if (score >= 100) return "orange";
  if (score >= 50) return "yellow";
  if (score >= 20) return "blue";
  return "gray";
}

export interface ScoreBreakdown {
  total: number;
  label: string;
  color: string;
  components: {
    emailOpens: { count: number; points: number };
    emailReplies: { count: number; points: number };
    meetingsBooked: { count: number; points: number };
    linkClicks: { count: number; points: number };
  };
  recencyMultiplier: number;
  lastActivityDate?: Date;
}

export function getScoreBreakdown(signals: EngagementSignals): ScoreBreakdown {
  const baseScores = {
    emailOpens: signals.emailOpens * SCORING_WEIGHTS.EMAIL_OPEN,
    emailReplies: signals.emailReplies * SCORING_WEIGHTS.EMAIL_REPLY,
    meetingsBooked: (signals.meetingsBooked ? 1 : 0) * SCORING_WEIGHTS.MEETING_BOOKED,
    linkClicks: signals.linkClicks * SCORING_WEIGHTS.LINK_CLICK,
  };

  let multiplier = RECENCY_MULTIPLIERS.OLDER;
  if (signals.lastActivityDate) {
    const daysSinceActivity = Math.floor(
      (Date.now() - signals.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity <= 7) {
      multiplier = RECENCY_MULTIPLIERS.LAST_7_DAYS;
    } else if (daysSinceActivity <= 30) {
      multiplier = RECENCY_MULTIPLIERS.LAST_30_DAYS;
    }
  }

  const total = calculateEngagementScore(signals);

  return {
    total,
    label: getScoreLabel(total),
    color: getScoreColor(total),
    components: {
      emailOpens: { count: signals.emailOpens, points: baseScores.emailOpens },
      emailReplies: { count: signals.emailReplies, points: baseScores.emailReplies },
      meetingsBooked: { count: signals.meetingsBooked ? 1 : 0, points: baseScores.meetingsBooked },
      linkClicks: { count: signals.linkClicks, points: baseScores.linkClicks },
    },
    recencyMultiplier: multiplier,
    lastActivityDate: signals.lastActivityDate,
  };
}
