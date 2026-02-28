/**
 * Meeting Co-pilot REST Router — Phase 2
 *
 * Endpoints:
 * - POST /api/meetings/start                  — launch a bot into a meeting
 * - POST /api/meetings/:id/stop               — stop a bot early
 * - POST /api/meetings/:id/link-deal          — link a meeting to a deal
 * - GET  /api/meetings                        — list sessions for the tenant
 * - GET  /api/meetings/:id                    — get session detail + transcript
 * - GET  /api/meetings/:id/stream             — SSE stream for real-time events
 * - GET  /api/meetings/pre-brief/:calEventId  — AI pre-brief for an upcoming meeting
 * - POST /api/meetings/webhook                — Recall.ai webhook receiver
 * - POST /api/meetings/:id/dismiss-suggestion — dismiss a co-pilot suggestion
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import {
  meetingSessions,
  meetingTranscripts,
  meetingCopilotSuggestions,
  users as usersTable,
  deals,
  dealStages,
  calendarEvents,
  people,
  accounts,
  knowledgeVault,
  tasks as tasksTable,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import {
  createMeetingSession,
  launchRecallBot,
  stopRecallBot,
  processTranscriptWebhook,
  processBotStatusWebhook,
  subscribeToSession,
  generatePostMeetingSummary,
} from "./meetingBotService";
import { invokeLLM } from "./_core/llm";

const meetingRouter = Router();

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function getAuthUser(req: Request): Promise<{ id: string; tenantId: string } | null> {
  try {
    const sessionCookie = (req as any).cookies?.['custom_auth_session'];
    if (!sessionCookie) return null;
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData?.userId) return null;
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(usersTable).where(eq(usersTable.id, sessionData.userId)).limit(1);
    if (!result.length) return null;
    return { id: result[0].id, tenantId: result[0].tenantId };
  } catch {
    return null;
  }
}

// ─── POST /api/meetings/start ─────────────────────────────────────────────────
meetingRouter.post("/meetings/start", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { meetingUrl, title, dealId, personId, accountId } = req.body;
  if (!meetingUrl) return res.status(400).json({ error: "meetingUrl is required" });

  try {
    const sessionId = await createMeetingSession({
      tenantId: user.tenantId,
      initiatedByUserId: user.id,
      meetingUrl,
      title,
      dealId,
      personId,
      accountId,
    });

    // Only launch the bot if RECALL_API_KEY is configured
    if (process.env.RECALL_API_KEY) {
      const recallBotId = await launchRecallBot(sessionId, meetingUrl);
      return res.json({ sessionId, recallBotId, status: "joining" });
    } else {
      // Demo mode — no bot, just create the session
      return res.json({ sessionId, recallBotId: null, status: "pending", demo: true });
    }
  } catch (err: any) {
    console.error("[MeetingRouter] Start error:", err);
    return res.status(500).json({ error: err.message ?? "Failed to start meeting session" });
  }
});

// ─── POST /api/meetings/:id/stop ─────────────────────────────────────────────
meetingRouter.post("/meetings/:id/stop", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });

  const session = sessions[0];
  if (session.recallBotId) {
    try {
      await stopRecallBot(session.recallBotId);
    } catch (err) {
      console.warn("[MeetingRouter] Stop bot warning:", err);
    }
  }

  await db
    .update(meetingSessions)
    .set({ status: "post_processing", endedAt: new Date(), updatedAt: new Date() })
    .where(eq(meetingSessions.id, session.id));

  // Trigger post-meeting summary (async)
  generatePostMeetingSummary(session.id).catch(err =>
    console.error("[MeetingRouter] Post-meeting summary error:", err)
  );

  return res.json({ success: true });
});

// ─── POST /api/meetings/:id/link-deal ────────────────────────────────────────
meetingRouter.post("/meetings/:id/link-deal", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const { dealId } = req.body;
  if (!dealId) return res.status(400).json({ error: "dealId is required" });

  // Verify the deal belongs to this tenant
  const dealRows = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, user.tenantId)))
    .limit(1);

  if (!dealRows.length) return res.status(404).json({ error: "Deal not found" });

  await db
    .update(meetingSessions)
    .set({ dealId, updatedAt: new Date() })
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)));

  return res.json({ success: true, dealId });
});

// ─── POST /api/meetings/:id/apply-to-deal ────────────────────────────────────
// Applies the meeting summary, action items, and stage recommendation to the linked deal
meetingRouter.post("/meetings/:id/apply-to-deal", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });

  const session = sessions[0];
  if (!session.dealId) return res.status(400).json({ error: "No deal linked to this session" });
  if (!session.summaryMarkdown) return res.status(400).json({ error: "Meeting summary not yet available" });

  // Get the current deal
  const dealRows = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, session.dealId), eq(deals.tenantId, user.tenantId)))
    .limit(1);

  if (!dealRows.length) return res.status(404).json({ error: "Linked deal not found" });
  const deal = dealRows[0];

  // Build the meeting note to append to deal notes
  const meetingNote = [
    `## Meeting: ${session.title}`,
    `*${session.createdAt.toISOString().split("T")[0]}*`,
    "",
    session.summaryMarkdown,
    "",
    ...(session.actionItems && (session.actionItems as string[]).length > 0
      ? ["**Action Items:**", ...(session.actionItems as string[]).map((a: string) => `- ${a}`), ""]
      : []),
    ...(session.keyTopics && (session.keyTopics as string[]).length > 0
      ? [`**Key Topics:** ${(session.keyTopics as string[]).join(", ")}`, ""]
      : []),
  ].join("\n");

  const updatedNotes = deal.notes
    ? `${deal.notes}\n\n---\n\n${meetingNote}`
    : meetingNote;

  // Determine if we should update the stage
  let stageUpdate: Record<string, any> = {};
  const { applyStageChange } = req.body;

  if (applyStageChange && session.dealStageRecommendation && session.dealStageRecommendation !== "no_change") {
    // Find the stage by name (case-insensitive match)
    const allStages = await db
      .select()
      .from(dealStages)
      .where(eq(dealStages.tenantId, user.tenantId));

    const recommendedStageName = session.dealStageRecommendation.replace(/_/g, " ");
    const matchedStage = allStages.find(
      s => s.name.toLowerCase() === recommendedStageName.toLowerCase()
    );

    if (matchedStage) {
      stageUpdate = { stageId: matchedStage.id };
    }
  }

  await db
    .update(deals)
    .set({ notes: updatedNotes, ...stageUpdate, updatedAt: new Date() })
    .where(eq(deals.id, deal.id));

  return res.json({
    success: true,
    noteAppended: true,
    stageUpdated: !!stageUpdate.stageId,
  });
});

// ─── GET /api/meetings ────────────────────────────────────────────────────────
meetingRouter.get("/meetings", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.json([]);

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(eq(meetingSessions.tenantId, user.tenantId))
    .orderBy(desc(meetingSessions.createdAt))
    .limit(50);

  return res.json(sessions);
});

// ─── GET /api/meetings/upcoming ──────────────────────────────────────────────
// Returns upcoming calendar events that could be pre-briefed
meetingRouter.get("/meetings/upcoming", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.json([]);

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.tenantId, user.tenantId),
        gte(calendarEvents.startTime, now),
        lte(calendarEvents.startTime, in24h)
      )
    )
    .orderBy(calendarEvents.startTime)
    .limit(10);

  return res.json(upcoming);
});

// ─── GET /api/meetings/pre-brief/:calEventId ─────────────────────────────────
// Generates an AI pre-brief for an upcoming calendar event
meetingRouter.get("/meetings/pre-brief/:calEventId", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  // Get the calendar event
  const calEventRows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, req.params.calEventId),
        eq(calendarEvents.tenantId, user.tenantId)
      )
    )
    .limit(1);

  if (!calEventRows.length) return res.status(404).json({ error: "Calendar event not found" });
  const calEvent = calEventRows[0];

  // Gather context: linked deal, contact, account
  let dealContext = "";
  let contactContext = "";
  let accountContext = "";
  let pastMeetingContext = "";

  if (calEvent.linkedDealId) {
    const dealRows = await db
      .select()
      .from(deals)
      .where(eq(deals.id, calEvent.linkedDealId))
      .limit(1);
    if (dealRows.length) {
      const d = dealRows[0];
      dealContext = `Deal: "${d.name}", Value: ${d.currency ?? "USD"} ${d.value ?? "unknown"}, Probability: ${d.probability ?? 50}%\nNotes: ${d.notes ?? "none"}`;
    }
  }

  if (calEvent.linkedContactId) {
    const contactRows = await db
      .select()
      .from(people)
      .where(eq(people.id, calEvent.linkedContactId))
      .limit(1);
    if (contactRows.length) {
      const c = contactRows[0];
      contactContext = `Contact: ${c.fullName}, Title: ${c.roleTitle ?? "unknown"}, Company: ${c.companyName ?? "unknown"}`;
    }
  }

  if (calEvent.linkedAccountId) {
    const accountRows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, calEvent.linkedAccountId))
      .limit(1);
    if (accountRows.length) {
      const a = accountRows[0];
      accountContext = `Account: ${a.name}, Industry: ${a.industry ?? "unknown"}, Size: ${a.employees ?? "unknown"} employees`;
    }
  }

  // Get past meeting summaries for this deal/contact
  if (calEvent.linkedDealId || calEvent.linkedContactId) {
    const pastSessions = await db
      .select()
      .from(meetingSessions)
      .where(
        and(
          eq(meetingSessions.tenantId, user.tenantId),
          calEvent.linkedDealId
            ? eq(meetingSessions.dealId, calEvent.linkedDealId)
            : eq(meetingSessions.personId, calEvent.linkedContactId!)
        )
      )
      .orderBy(desc(meetingSessions.createdAt))
      .limit(3);

    if (pastSessions.length) {
      pastMeetingContext = pastSessions
        .filter(s => s.summaryMarkdown)
        .map(s => `[${s.createdAt.toISOString().split("T")[0]}] ${s.summaryMarkdown}`)
        .join("\n\n");
    }
  }

  const prompt = `You are an AI sales co-pilot preparing a pre-meeting brief for a sales rep.

MEETING: "${calEvent.title}"
TIME: ${calEvent.startTime.toISOString()}
ATTENDEES: ${(calEvent.attendees as string[] ?? []).join(", ") || "unknown"}

${dealContext ? `DEAL CONTEXT:\n${dealContext}\n` : ""}
${contactContext ? `CONTACT:\n${contactContext}\n` : ""}
${accountContext ? `ACCOUNT:\n${accountContext}\n` : ""}
${pastMeetingContext ? `PREVIOUS MEETINGS:\n${pastMeetingContext}\n` : ""}

Generate a concise pre-meeting brief in this exact JSON format:
{
  "objective": "One sentence: what should the rep aim to achieve in this meeting",
  "keyPoints": ["3-5 key things to know or remember going into this meeting"],
  "suggestedAgenda": ["3-4 agenda items in order"],
  "watchOutFor": ["1-3 risks or sensitivities to be aware of"],
  "openLoops": ["Any unresolved action items or questions from previous meetings"],
  "talkingPoints": ["2-3 specific talking points tailored to this prospect"]
}`;

  try {
    const response = await invokeLLM(prompt, { maxTokens: 800, temperature: 0.3 });
    const parsed = JSON.parse(response.trim());
    return res.json({
      calEvent,
      brief: parsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[MeetingRouter] Pre-brief error:", err);
    return res.status(500).json({ error: "Failed to generate pre-brief" });
  }
});

// ─── GET /api/meetings/:id ────────────────────────────────────────────────────
meetingRouter.get("/meetings/:id", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });

  const transcripts = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.sessionId, req.params.id))
    .orderBy(meetingTranscripts.createdAt);

  const suggestions = await db
    .select()
    .from(meetingCopilotSuggestions)
    .where(eq(meetingCopilotSuggestions.sessionId, req.params.id))
    .orderBy(meetingCopilotSuggestions.createdAt);

  // Enrich with deal info if linked
  let linkedDeal = null;
  if (sessions[0].dealId) {
    const dealRows = await db
      .select()
      .from(deals)
      .where(eq(deals.id, sessions[0].dealId))
      .limit(1);
    if (dealRows.length) linkedDeal = dealRows[0];
  }

  return res.json({ session: sessions[0], transcripts, suggestions, linkedDeal });
});

// ─── GET /api/meetings/:id/stream (Server-Sent Events) ───────────────────────
meetingRouter.get("/meetings/:id/stream", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  const unsubscribe = subscribeToSession(req.params.id, send);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// ─── POST /api/meetings/webhook (Recall.ai webhook receiver) ─────────────────
meetingRouter.post("/meetings/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const payload = req.body;
  if (!payload) return;

  try {
    if (payload.event === "bot.transcription" || payload.transcript) {
      await processTranscriptWebhook({
        bot_id: payload.bot_id ?? payload.data?.bot_id,
        transcript: payload.transcript ?? payload.data?.transcript,
      });
    }

    if (payload.event === "bot.status_change" || payload.status) {
      await processBotStatusWebhook({
        bot_id: payload.bot_id ?? payload.data?.bot_id,
        status: payload.status ?? payload.data?.status,
      });
    }
  } catch (err) {
    console.error("[MeetingRouter] Webhook processing error:", err);
  }
});

// ─── POST /api/meetings/:id/dismiss-suggestion ───────────────────────────────
meetingRouter.post("/meetings/:id/dismiss-suggestion", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const { suggestionId } = req.body;
  if (!suggestionId) return res.status(400).json({ error: "suggestionId is required" });

  await db
    .update(meetingCopilotSuggestions)
    .set({ dismissed: true })
    .where(
      and(
        eq(meetingCopilotSuggestions.id, suggestionId),
        eq(meetingCopilotSuggestions.tenantId, user.tenantId)
      )
    );

  return res.json({ success: true });
});

// ─── GET /api/meetings/deal/:dealId ─────────────────────────────────────────
// Returns all meeting sessions linked to a specific deal (for DealDetail page)
meetingRouter.get("/meetings/deal/:dealId", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.json([]);

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.dealId, req.params.dealId), eq(meetingSessions.tenantId, user.tenantId)))
    .orderBy(desc(meetingSessions.createdAt))
    .limit(10);

  return res.json(sessions);
});

// ─── GET /api/meetings/:id/competitor-intel ──────────────────────────────────
// Queries the Knowledge Vault for competitor intelligence cards
meetingRouter.get("/meetings/:id/competitor-intel", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.json([]);

  // Get the session to find recent transcript for competitor mentions
  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });

  // Get recent transcript to detect competitor mentions
  const recentTranscripts = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.sessionId, req.params.id))
    .orderBy(desc(meetingTranscripts.createdAt))
    .limit(30);

  const transcriptText = recentTranscripts.map(t => t.text).join(" ").toLowerCase();

  // Query knowledge vault for competitor_intel entries
  const competitorEntries = await db
    .select()
    .from(knowledgeVault)
    .where(
      and(
        eq(knowledgeVault.tenantId, user.tenantId),
        eq(knowledgeVault.category, "competitor_intel")
      )
    )
    .limit(20);

  // Filter to entries that are relevant to what's being discussed
  const relevant = competitorEntries.filter(entry => {
    const entryText = `${entry.title} ${entry.extractedContent ?? ""}`.toLowerCase();
    // Check if competitor name appears in transcript
    const words = entry.title.toLowerCase().split(/\s+/);
    return words.some(w => w.length > 3 && transcriptText.includes(w));
  });

  return res.json(relevant.map(e => ({
    id: e.id,
    title: e.title,
    summary: e.summary,
    extractedContent: e.extractedContent,
    category: e.category,
    createdAt: e.createdAt,
  })));
});

// ─── POST /api/meetings/:id/create-tasks ─────────────────────────────────────
// Creates CRM tasks from meeting action items
meetingRouter.post("/meetings/:id/create-tasks", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });
  const session = sessions[0];

  const { actionItems, dueDate } = req.body;
  if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
    return res.status(400).json({ error: "actionItems array is required" });
  }

  const { v4: uuidv4 } = await import("uuid");
  const createdTaskIds: string[] = [];

  for (const item of actionItems) {
    const taskId = uuidv4();
    await db.insert(tasksTable).values({
      id: taskId,
      tenantId: user.tenantId,
      title: item,
      description: `Action item from meeting: ${session.title ?? session.meetingUrl}`,
      status: "todo",
      priority: "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedToId: user.id,
      createdById: user.id,
      linkedEntityType: session.dealId ? "deal" : undefined,
      linkedEntityId: session.dealId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdTaskIds.push(taskId);
  }

  return res.json({ success: true, createdCount: createdTaskIds.length, taskIds: createdTaskIds });
});

// ─── GET /api/meetings/:id/health-score ──────────────────────────────────────
// Computes or returns the meeting health score
meetingRouter.get("/meetings/:id/health-score", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(and(eq(meetingSessions.id, req.params.id), eq(meetingSessions.tenantId, user.tenantId)))
    .limit(1);

  if (!sessions.length) return res.status(404).json({ error: "Session not found" });
  const session = sessions[0];

  // Sentiment score: 0-1 range (40% weight)
  const sentimentScore = session.sentimentScore ?? 0.5;
  const sentimentComponent = sentimentScore * 40;

  // Talk ratio balance: ideal is 40-60% rep vs prospect (30% weight)
  // Score 100 if balanced, 0 if one person spoke 100%
  let talkRatioComponent = 15; // default middle
  const talkRatio = session.talkRatio as Record<string, number> | null;
  if (talkRatio) {
    const values = Object.values(talkRatio);
    if (values.length >= 2) {
      const sorted = values.sort((a, b) => b - a);
      const dominance = sorted[0]; // highest speaker percentage
      // Perfect balance = 50%, worst = 100% (one person)
      const balanceScore = 1 - Math.max(0, (dominance - 50) / 50);
      talkRatioComponent = balanceScore * 30;
    }
  }

  // Action items agreed (30% weight) — presence of action items = good sign
  const actionItems = session.actionItems as string[] | null;
  const hasActionItems = actionItems && actionItems.length > 0;
  const actionItemScore = hasActionItems ? Math.min(actionItems!.length / 3, 1) : 0;
  const actionItemComponent = actionItemScore * 30;

  const totalScore = Math.round(sentimentComponent + talkRatioComponent + actionItemComponent);

  let grade: string;
  let label: string;
  let color: string;
  if (totalScore >= 80) { grade = "A"; label = "Excellent"; color = "green"; }
  else if (totalScore >= 65) { grade = "B"; label = "Good"; color = "blue"; }
  else if (totalScore >= 50) { grade = "C"; label = "Fair"; color = "yellow"; }
  else if (totalScore >= 35) { grade = "D"; label = "Needs Improvement"; color = "orange"; }
  else { grade = "F"; label = "Poor"; color = "red"; }

  return res.json({
    sessionId: session.id,
    score: totalScore,
    grade,
    label,
    color,
    breakdown: {
      sentiment: { score: Math.round(sentimentComponent), weight: 40, raw: sentimentScore },
      talkRatio: { score: Math.round(talkRatioComponent), weight: 30 },
      actionItems: { score: Math.round(actionItemComponent), weight: 30, count: actionItems?.length ?? 0 },
    },
  });
});

export default meetingRouter;
