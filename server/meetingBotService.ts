/**
 * Meeting Bot Service — Recall.ai Integration
 *
 * Handles creating, monitoring, and stopping meeting bots via the Recall.ai API.
 * Recall.ai provides a unified API to join Google Meet, Zoom, and Teams calls
 * as a headless bot participant that records and streams audio/transcripts.
 */

import axios from "axios";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { meetingSessions, meetingTranscripts, meetingCopilotSuggestions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

const RECALL_API_BASE = "https://us-east-1.recall.ai/api/v1";

function getRecallHeaders() {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) throw new Error("RECALL_API_KEY environment variable is not set");
  return {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Detect the meeting platform from a URL
 */
export function detectPlatform(url: string): string {
  if (url.includes("meet.google.com")) return "google_meet";
  if (url.includes("zoom.us")) return "zoom";
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) return "teams";
  if (url.includes("webex.com")) return "webex";
  return "unknown";
}

/**
 * Create a new meeting session record in the database
 */
export async function createMeetingSession(params: {
  tenantId: string;
  initiatedByUserId: string;
  meetingUrl: string;
  title?: string;
  dealId?: string;
  personId?: string;
  accountId?: string;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const platform = detectPlatform(params.meetingUrl);

  await db.insert(meetingSessions).values({
    id,
    tenantId: params.tenantId,
    initiatedByUserId: params.initiatedByUserId,
    meetingUrl: params.meetingUrl,
    title: params.title ?? "Untitled Meeting",
    platform,
    dealId: params.dealId,
    personId: params.personId,
    accountId: params.accountId,
    status: "pending",
  });

  return id;
}

/**
 * Send a Recall.ai bot to join a meeting.
 * Returns the Recall bot ID.
 */
export async function launchRecallBot(sessionId: string, meetingUrl: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const webhookUrl = `${process.env.APP_URL ?? "https://www.crmneurovitality.com"}/api/meetings/webhook`;

  const payload = {
    meeting_url: meetingUrl,
    bot_name: "NeuroVitality AI",
    transcription_options: {
      provider: "meeting_captions",
    },
    real_time_transcription: {
      destination_url: webhookUrl,
      partial_results: false,
    },
    recording_mode: "audio_only",
    automatic_leave: {
      everyone_left_timeout: 120,
      silence_detection: {
        timeout: 300,
        activate_after: 120,
      },
    },
  };

  const response = await axios.post(`${RECALL_API_BASE}/bot/`, payload, {
    headers: getRecallHeaders(),
  });

  const recallBotId: string = response.data.id;

  // Update the session with the bot ID and status
  await db
    .update(meetingSessions)
    .set({ recallBotId, status: "joining", updatedAt: new Date() })
    .where(eq(meetingSessions.id, sessionId));

  return recallBotId;
}

/**
 * Stop a Recall.ai bot (leave the meeting early)
 */
export async function stopRecallBot(recallBotId: string): Promise<void> {
  await axios.post(
    `${RECALL_API_BASE}/bot/${recallBotId}/leave_call/`,
    {},
    { headers: getRecallHeaders() }
  );
}

/**
 * Get the current status of a Recall.ai bot
 */
export async function getRecallBotStatus(recallBotId: string): Promise<{
  status: string;
  statusChanges: Array<{ code: string; created_at: string }>;
}> {
  const response = await axios.get(`${RECALL_API_BASE}/bot/${recallBotId}/`, {
    headers: getRecallHeaders(),
  });
  return {
    status: response.data.status_changes?.slice(-1)[0]?.code ?? "unknown",
    statusChanges: response.data.status_changes ?? [],
  };
}

/**
 * Process an incoming real-time transcript webhook from Recall.ai.
 * Saves the utterance to the database and triggers AI analysis.
 */
export async function processTranscriptWebhook(payload: {
  bot_id: string;
  transcript: {
    speaker: string;
    words: Array<{ text: string; start_time: number; end_time: number; confidence: number }>;
  };
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find the session by bot ID
  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(eq(meetingSessions.recallBotId, payload.bot_id))
    .limit(1);

  if (!sessions.length) {
    console.warn(`[MeetingBot] No session found for bot ${payload.bot_id}`);
    return;
  }

  const session = sessions[0];
  const words = payload.transcript?.words ?? [];
  if (!words.length) return;

  const text = words.map(w => w.text).join(" ").trim();
  if (!text) return;

  const startMs = Math.round((words[0].start_time ?? 0) * 1000);
  const endMs = Math.round((words[words.length - 1].end_time ?? 0) * 1000);
  const avgConfidence = words.reduce((sum, w) => sum + (w.confidence ?? 1), 0) / words.length;

  // Save transcript utterance
  const transcriptId = nanoid();
  await db.insert(meetingTranscripts).values({
    id: transcriptId,
    sessionId: session.id,
    tenantId: session.tenantId,
    speaker: payload.transcript.speaker ?? "Unknown",
    speakerType: "unknown",
    text,
    confidence: avgConfidence,
    startMs,
    endMs,
  });

  // Update session status to in_progress if it was joining
  if (session.status === "joining" || session.status === "pending") {
    await db
      .update(meetingSessions)
      .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(meetingSessions.id, session.id));
  }

  // Trigger async AI analysis (fire and forget — don't block the webhook response)
  analyzeTranscriptForSuggestions(session.id, session.tenantId, text, session.dealId ?? undefined).catch(
    err => console.error("[MeetingBot] AI analysis error:", err)
  );
}

/**
 * Process a bot status change webhook from Recall.ai (e.g. done, failed)
 */
export async function processBotStatusWebhook(payload: {
  bot_id: string;
  status: { code: string; created_at: string };
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const sessions = await db
    .select()
    .from(meetingSessions)
    .where(eq(meetingSessions.recallBotId, payload.bot_id))
    .limit(1);

  if (!sessions.length) return;

  const session = sessions[0];
  const code = payload.status?.code;

  if (code === "done" || code === "call_ended") {
    await db
      .update(meetingSessions)
      .set({ status: "post_processing", endedAt: new Date(), updatedAt: new Date() })
      .where(eq(meetingSessions.id, session.id));

    // Trigger post-meeting summary generation
    generatePostMeetingSummary(session.id).catch(
      err => console.error("[MeetingBot] Post-meeting summary error:", err)
    );
  } else if (code === "fatal" || code === "error") {
    await db
      .update(meetingSessions)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(meetingSessions.id, session.id));
  } else if (code === "in_waiting_room" || code === "joining_call") {
    await db
      .update(meetingSessions)
      .set({ status: "joining", updatedAt: new Date() })
      .where(eq(meetingSessions.id, session.id));
  }
}

/**
 * Analyse the latest transcript text and generate real-time co-pilot suggestions.
 * Runs asynchronously — suggestions are broadcast via WebSocket separately.
 */
async function analyzeTranscriptForSuggestions(
  sessionId: string,
  tenantId: string,
  latestText: string,
  dealId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Retrieve recent transcript context (last 10 utterances)
  const recent = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.sessionId, sessionId))
    .orderBy(meetingTranscripts.createdAt)
    .limit(10);

  const context = recent.map(r => `${r.speaker}: ${r.text}`).join("\n");

  // Build a prompt for real-time suggestions
  const prompt = `You are an AI sales co-pilot listening to a live sales call. Analyse the conversation and determine if any of the following situations apply:

1. OBJECTION - The prospect has raised a pricing, timing, authority, or need objection
2. COMPETITOR - A competitor product or company has been mentioned
3. NEXT_STEP - The conversation has reached a natural point to propose a next step or close
4. RISK - A risk signal has been detected (e.g. prospect seems disengaged, mentions budget freeze, mentions another vendor)

Recent conversation:
${context}

Latest utterance: "${latestText}"

If one of the above situations applies, respond with a JSON object in this exact format:
{
  "type": "objection_handling" | "competitor_mention" | "next_step" | "risk_flag",
  "title": "Short title (max 8 words)",
  "body": "Specific, actionable suggestion (2-3 sentences max)",
  "triggerText": "The exact phrase that triggered this suggestion",
  "confidence": 0.0 to 1.0
}

If none of the above apply, respond with: {"type": "none"}`;

  try {
    const response = await invokeLLM(prompt, { maxTokens: 300, temperature: 0.3 });
    const parsed = JSON.parse(response.trim());

    if (parsed.type === "none" || !parsed.type) return;
    if (parsed.confidence < 0.6) return; // Only surface high-confidence suggestions

    const suggestionId = nanoid();
    await db.insert(meetingCopilotSuggestions).values({
      id: suggestionId,
      sessionId,
      tenantId,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      triggerText: parsed.triggerText,
      confidence: parsed.confidence,
    });

    // Broadcast the suggestion via WebSocket
    broadcastToSession(sessionId, {
      event: "copilot_suggestion",
      suggestion: {
        id: suggestionId,
        type: parsed.type,
        title: parsed.title,
        body: parsed.body,
        triggerText: parsed.triggerText,
        confidence: parsed.confidence,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    // JSON parse failures are expected when the model returns "none" — suppress
    if (!(err instanceof SyntaxError)) {
      console.error("[MeetingBot] Suggestion analysis error:", err);
    }
  }
}

/**
 * Generate a post-meeting summary using the full transcript.
 */
export async function generatePostMeetingSummary(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const transcripts = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.sessionId, sessionId))
    .orderBy(meetingTranscripts.createdAt);

  if (!transcripts.length) {
    await db
      .update(meetingSessions)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(meetingSessions.id, sessionId));
    return;
  }

  const fullTranscript = transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");

  const prompt = `You are an AI sales analyst. Analyse the following sales call transcript and produce a structured summary.

TRANSCRIPT:
${fullTranscript}

Respond with a JSON object in this exact format:
{
  "summary": "3-5 sentence executive summary of the call",
  "actionItems": ["Action item 1", "Action item 2", "Action item 3"],
  "dealStageRecommendation": "discovery | qualification | proposal | negotiation | closed_won | closed_lost | no_change",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentimentScore": 0.0 to 1.0 (0=very negative, 0.5=neutral, 1=very positive),
  "talkRatio": { "rep": 0.0 to 1.0, "prospect": 0.0 to 1.0 }
}`;

  try {
    const response = await invokeLLM(prompt, { maxTokens: 600, temperature: 0.2 });
    const parsed = JSON.parse(response.trim());

    // Calculate actual duration
    const session = await db
      .select()
      .from(meetingSessions)
      .where(eq(meetingSessions.id, sessionId))
      .limit(1);

    const durationSeconds = session[0]?.startedAt
      ? Math.round((Date.now() - session[0].startedAt.getTime()) / 1000)
      : undefined;

    await db
      .update(meetingSessions)
      .set({
        status: "done",
        summaryMarkdown: parsed.summary,
        actionItems: parsed.actionItems ?? [],
        dealStageRecommendation: parsed.dealStageRecommendation,
        keyTopics: parsed.keyTopics ?? [],
        sentimentScore: parsed.sentimentScore,
        talkRatio: parsed.talkRatio,
        durationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(meetingSessions.id, sessionId));

    // Broadcast completion to the frontend
    broadcastToSession(sessionId, {
      event: "meeting_complete",
      summary: parsed.summary,
      actionItems: parsed.actionItems,
      dealStageRecommendation: parsed.dealStageRecommendation,
    });
  } catch (err) {
    console.error("[MeetingBot] Post-meeting summary generation error:", err);
    await db
      .update(meetingSessions)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(meetingSessions.id, sessionId));
  }
}

// ============ WEBSOCKET BROADCAST ============
// Simple in-process WebSocket registry — sessions subscribe by sessionId

const sessionSubscribers = new Map<string, Set<(data: object) => void>>();

export function subscribeToSession(sessionId: string, callback: (data: object) => void): () => void {
  if (!sessionSubscribers.has(sessionId)) {
    sessionSubscribers.set(sessionId, new Set());
  }
  sessionSubscribers.get(sessionId)!.add(callback);

  // Return unsubscribe function
  return () => {
    sessionSubscribers.get(sessionId)?.delete(callback);
  };
}

export function broadcastToSession(sessionId: string, data: object): void {
  const subscribers = sessionSubscribers.get(sessionId);
  if (!subscribers) return;
  for (const cb of subscribers) {
    try {
      cb(data);
    } catch (err) {
      console.error("[MeetingBot] Broadcast error:", err);
    }
  }
}
