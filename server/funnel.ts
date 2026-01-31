import type { Thread, Moment, NextAction } from "../drizzle/schema";

export type FunnelStage =
  | "prospected"
  | "engaged"
  | "active"
  | "waiting"
  | "dormant"
  | "closed_won"
  | "closed_lost";

export interface ThreadWithFunnel extends Thread {
  moments: Moment[];
  nextActions: NextAction[];
  funnelStage: FunnelStage;
}

/**
 * Compute funnel stage for a thread based on its moments, actions, and status.
 * First matching stage in priority order wins.
 */
export function computeFunnelStage(
  thread: Thread,
  moments: Moment[],
  nextActions: NextAction[]
): FunnelStage {
  // Priority 1: Closed Won
  if (
    moments.some((m) => m.type === "deal_won") ||
    thread.dealSignal?.outcome === "won"
  ) {
    return "closed_won";
  }

  // Priority 2: Closed Lost
  if (
    moments.some((m) => m.type === "deal_lost") ||
    thread.dealSignal?.outcome === "lost" ||
    moments.some(
      (m) =>
        m.type === "signal_detected" &&
        (m.metadata?.reason === "unsubscribed" || m.metadata?.reason === "no_go")
    )
  ) {
    return "closed_lost";
  }

  // Priority 3: Waiting
  if (thread.status === "waiting") {
    return "waiting";
  }

  // Priority 4: Dormant
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const hasRecentActivity = moments.some(
    (m) => new Date(m.timestamp).getTime() > thirtyDaysAgo
  );
  if (thread.status === "dormant" || !hasRecentActivity) {
    return "dormant";
  }

  // Priority 5: Active
  const hasOpenAction = nextActions.some((a) => a.status === "open");
  if (hasOpenAction) {
    return "active";
  }

  // Priority 6: Engaged
  const hasEngagement =
    moments.some((m) => m.type === "reply_received") ||
    moments.some((m) => m.type === "meeting_held");
  if (hasEngagement) {
    return "engaged";
  }

  // Priority 7: Prospected (default)
  const hasOutreach = moments.some((m) => m.type === "email_sent");
  const hasNoEngagement =
    !moments.some((m) => m.type === "reply_received") &&
    !moments.some((m) => m.type === "meeting_held");
  if (hasOutreach && hasNoEngagement) {
    return "prospected";
  }

  // Fallback
  return "prospected";
}

/**
 * Group threads by funnel stage
 */
export function groupThreadsByStage(
  threadsWithData: Array<{
    thread: Thread;
    moments: Moment[];
    nextActions: NextAction[];
  }>
): Record<FunnelStage, ThreadWithFunnel[]> {
  const grouped: Record<FunnelStage, ThreadWithFunnel[]> = {
    prospected: [],
    engaged: [],
    active: [],
    waiting: [],
    dormant: [],
    closed_won: [],
    closed_lost: [],
  };

  for (const { thread, moments, nextActions } of threadsWithData) {
    const stage = computeFunnelStage(thread, moments, nextActions);
    grouped[stage].push({
      ...thread,
      moments,
      nextActions,
      funnelStage: stage,
    });
  }

  return grouped;
}

/**
 * Compute velocity metrics from moments
 */
export function computeVelocity(moments: Moment[]): {
  median_days_first_contact_to_reply: number | null;
  median_days_reply_to_meeting: number | null;
  median_days_meeting_to_close_signal: number | null;
} {
  const threadGroups = new Map<string, Moment[]>();
  
  // Group moments by thread
  for (const moment of moments) {
    const existing = threadGroups.get(moment.threadId) || [];
    existing.push(moment);
    threadGroups.set(moment.threadId, existing);
  }

  const contactToReplyDays: number[] = [];
  const replyToMeetingDays: number[] = [];
  const meetingToCloseDays: number[] = [];

  for (const threadMoments of Array.from(threadGroups.values())) {
    const sorted = threadMoments.sort(
      (a: Moment, b: Moment) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstContact = sorted.find(
      (m: Moment) => m.type === "email_sent" || m.type === "lead_captured"
    );
    const firstReply = sorted.find((m: Moment) => m.type === "reply_received");
    const firstMeeting = sorted.find((m: Moment) => m.type === "meeting_held");
    const closeSignal = sorted.find(
      (m: Moment) =>
        m.type === "deal_won" ||
        m.type === "deal_lost" ||
        (m.type === "signal_detected" &&
          (m.metadata?.reason === "unsubscribed" || m.metadata?.reason === "no_go"))
    );

    if (firstContact && firstReply) {
      const days =
        (new Date(firstReply.timestamp).getTime() -
          new Date(firstContact.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      contactToReplyDays.push(days);
    }

    if (firstReply && firstMeeting) {
      const days =
        (new Date(firstMeeting.timestamp).getTime() -
          new Date(firstReply.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      replyToMeetingDays.push(days);
    }

    if (firstMeeting && closeSignal) {
      const days =
        (new Date(closeSignal.timestamp).getTime() -
          new Date(firstMeeting.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      meetingToCloseDays.push(days);
    }
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  };

  return {
    median_days_first_contact_to_reply: median(contactToReplyDays),
    median_days_reply_to_meeting: median(replyToMeetingDays),
    median_days_meeting_to_close_signal: median(meetingToCloseDays),
  };
}
