/**
 * Meeting Co-pilot REST Router
 *
 * Handles:
 * - POST /api/meetings/start       — launch a bot into a meeting
 * - POST /api/meetings/:id/stop    — stop a bot early
 * - GET  /api/meetings             — list sessions for the tenant
 * - GET  /api/meetings/:id         — get session detail + transcript
 * - GET  /api/meetings/:id/stream  — SSE stream for real-time events
 * - POST /api/meetings/webhook     — Recall.ai webhook receiver
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import {
  meetingSessions,
  meetingTranscripts,
  meetingCopilotSuggestions,
  users as usersTable,
} from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  createMeetingSession,
  launchRecallBot,
  stopRecallBot,
  processTranscriptWebhook,
  processBotStatusWebhook,
  subscribeToSession,
} from "./meetingBotService";

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
    const result = await db.select().from(usersTable).where(eqUser(usersTable.id, sessionData.userId)).limit(1);
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
    .where(
      and(
        eq(meetingSessions.id, req.params.id),
        eq(meetingSessions.tenantId, user.tenantId)
      )
    )
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

  return res.json({ success: true });
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

// ─── GET /api/meetings/:id ────────────────────────────────────────────────────
meetingRouter.get("/meetings/:id", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(
      and(
        eq(meetingSessions.id, req.params.id),
        eq(meetingSessions.tenantId, user.tenantId)
      )
    )
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

  return res.json({ session: sessions[0], transcripts, suggestions });
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

  // Send a heartbeat every 15 seconds to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  // Subscribe to session events
  const unsubscribe = subscribeToSession(req.params.id, send);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// ─── POST /api/meetings/webhook (Recall.ai webhook receiver) ─────────────────
meetingRouter.post("/meetings/webhook", async (req: Request, res: Response) => {
  // Recall.ai sends webhooks — respond 200 immediately to acknowledge receipt
  res.status(200).json({ received: true });

  const payload = req.body;
  if (!payload) return;

  try {
    // Transcript event
    if (payload.event === "bot.transcription" || payload.transcript) {
      await processTranscriptWebhook({
        bot_id: payload.bot_id ?? payload.data?.bot_id,
        transcript: payload.transcript ?? payload.data?.transcript,
      });
    }

    // Status change event
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

export default meetingRouter;
