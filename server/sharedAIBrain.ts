/**
 * sharedAIBrain.ts
 *
 * The unified AI brain for NeuroVitality CRM.
 * Every AI touchpoint on the platform calls this module to get:
 *   1. Full CRM context (contacts, deals, notes, team chat, activities)
 *   2. Persistent memory (learned facts, preferences, patterns)
 *   3. A role-appropriate system prompt persona
 *
 * Available personas / "hats":
 *   - "assistant"     → General AI assistant (default)
 *   - "email_writer"  → Expert email copywriter
 *   - "analyst"       → CRM data analyst & insights engine
 *   - "coach"         → Sales coach & deal advisor
 *   - "chat"          → Team chat helper (concise, conversational)
 *   - "sequence"      → Outreach sequence strategist
 *   - "scorer"        → Lead scoring & qualification expert
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { getDb } from "./db";
import { notes, deals } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  getMemoriesForTenant,
  formatMemoriesForPrompt,
  extractAndStoreMemories,
} from "./aiMemoryService";

export type AIPersona =
  | "assistant"
  | "email_writer"
  | "analyst"
  | "coach"
  | "chat"
  | "sequence"
  | "scorer";

export interface BrainMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BrainCallParams {
  tenantId: string;
  userId: string;
  persona: AIPersona;
  messages: BrainMessage[];
  /** Optional focused context for a specific entity (contact, deal, account) */
  entityContext?: {
    type: "contact" | "deal" | "account";
    id?: string;
    name?: string;
    company?: string;
    title?: string;
    industry?: string;
    notes?: string[];
  };
  /** Whether to extract and store new memories from this exchange */
  extractMemories?: boolean;
  /** Skip loading full CRM context (faster, for lightweight calls) */
  lightweightMode?: boolean;
}

export interface BrainCallResult {
  response: string;
  persona: AIPersona;
}

// ─── Persona definitions ────────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<AIPersona, string> = {
  assistant: `You are the NeuroVitality CRM AI Assistant — a knowledgeable, proactive business intelligence partner. You have deep access to the team's CRM data, deal pipeline, contact history, notes, and team conversations. You provide strategic insights, answer questions about the business, and help the team work smarter. Be concise, direct, and always ground your answers in the actual data you have access to.`,

  email_writer: `You are the NeuroVitality CRM Email Copywriter — an expert at crafting highly personalised, effective business emails that get responses. You understand the company's clients, deals, and communication history. You write emails that feel human, reference specific context about the recipient, and always have a clear purpose and call-to-action. Keep cold outreach under 150 words. Match the tone and style preferences you've learned about this team.`,

  analyst: `You are the NeuroVitality CRM Data Analyst — you specialise in turning CRM data into clear, actionable business intelligence. You identify patterns in deal flow, contact engagement, pipeline health, and team activity. You provide concise summaries with specific numbers and highlight what needs attention. Always be factual and reference the actual data you can see.`,

  coach: `You are the NeuroVitality CRM Sales Coach — an experienced advisor who helps the team close more deals, improve their outreach, and develop better client relationships. You know the current pipeline, which deals are at risk, and what's working. You give specific, practical advice based on the real data in the CRM. Be encouraging but honest.`,

  chat: `You are the NeuroVitality CRM Team Assistant — a helpful, concise colleague in the team chat. You answer questions about CRM data, help with quick tasks, and provide brief insights. Keep responses short and conversational. If you need to show data, use a simple list. Never give long essays in chat.`,

  sequence: `You are the NeuroVitality CRM Outreach Strategist — you design effective multi-step email and call sequences for sales outreach. You understand the company's target audience, communication style, and what's worked before. You create sequences that are personalised, well-timed, and have clear objectives at each step. Reference the team's actual clients and industry context when designing sequences.`,

  scorer: `You are the NeuroVitality CRM Lead Scoring Expert — you evaluate contacts and leads based on their engagement signals, profile fit, and behaviour patterns. You provide clear scoring rationale and highlight the most important signals. You help the team prioritise who to focus on and why.`,
};

// ─── CRM context builder ─────────────────────────────────────────────────────

async function gatherCRMContext(tenantId: string) {
  const dbConn = await getDb();

  const [people, threads, moments, integrations] = await Promise.all([
    db.getPeopleByTenant(tenantId),
    db.getThreadsByTenant(tenantId),
    db.getMomentsByTenant(tenantId),
    db.getIntegrationsByTenant(tenantId),
  ]);

  let allDeals: any[] = [];
  let recentNotes: any[] = [];
  let recentChatMessages: any[] = [];

  if (dbConn) {
    [allDeals, recentNotes] = await Promise.all([
      dbConn.select().from(deals).where(eq(deals.tenantId, tenantId)).orderBy(desc(deals.updatedAt)).limit(30),
      dbConn.select().from(notes).where(eq(notes.tenantId, tenantId)).orderBy(desc(notes.createdAt)).limit(20),
    ]);

    const tenantChannels = await db.getChannelsByTenant(tenantId);
    if (tenantChannels.length > 0) {
      const channelSamples = await Promise.all(
        tenantChannels.slice(0, 3).map(async (ch: any) => {
          const msgs = await db.getMessagesByChannel(ch.id, 5);
          return msgs.map((m: any) => ({
            channel: ch.name,
            author: m.user?.name || m.userId,
            content: m.content,
            date: m.createdAt,
          }));
        })
      );
      recentChatMessages = channelSamples.flat();
    }
  }

  const funnelStages: Record<string, number> = {};
  threads.forEach((t: any) => {
    const stage = t.funnelStage || "prospected";
    funnelStages[stage] = (funnelStages[stage] || 0) + 1;
  });

  const totalDealValue = allDeals.reduce((sum: number, d: any) => sum + parseFloat(d.value || "0"), 0);

  return {
    totalContacts: people.length,
    totalThreads: threads.length,
    totalMoments: moments.length,
    funnelStages,
    integrations: integrations.map((i: any) => ({ type: i.type, connected: !!i.apiKey })),
    topContacts: people.slice(0, 15).map((p: any) => ({
      name: p.name || p.fullName,
      email: p.email,
      company: p.company,
      title: p.title,
    })),
    deals: allDeals.slice(0, 20).map((d: any) => ({
      name: d.name,
      value: d.value ? `GBP ${parseFloat(d.value).toLocaleString()}` : "No value set",
      probability: d.probability ? `${d.probability}%` : "50%",
      expectedClose: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("en-GB") : "Not set",
      notes: d.notes ? d.notes.substring(0, 100) : null,
    })),
    totalDealValue: `GBP ${totalDealValue.toLocaleString()}`,
    totalDeals: allDeals.length,
    recentNotes: recentNotes.map((n: any) => ({
      entityType: n.entityType,
      content: n.content.substring(0, 200),
      author: n.createdByName,
      date: new Date(n.createdAt).toLocaleDateString("en-GB"),
    })),
    recentChatMessages: recentChatMessages.slice(0, 15).map((m: any) => ({
      channel: m.channel,
      author: m.author,
      content: m.content?.substring(0, 150),
      date: m.date ? new Date(m.date).toLocaleDateString("en-GB") : "",
    })),
  };
}

// ─── System prompt builder ───────────────────────────────────────────────────

function buildSystemPrompt(
  persona: AIPersona,
  context: any,
  memories: any[],
  entityContext?: BrainCallParams["entityContext"]
): string {
  const personaPrompt = PERSONA_PROMPTS[persona];
  const memorySection = formatMemoriesForPrompt(memories);

  let prompt = `${personaPrompt}\n\n`;

  // Inject persistent memory
  if (memorySection) {
    prompt += `## What I Know About This Team (Persistent Memory)\n${memorySection}\n\n`;
  }

  // Inject CRM context (skip in lightweight mode — context will be null)
  if (context) {
    prompt += `## Live CRM Data\n`;
    prompt += `- Total Contacts: ${context.totalContacts}\n`;
    prompt += `- Active Threads: ${context.totalThreads}\n`;
    prompt += `- Total Activities: ${context.totalMoments}\n`;
    prompt += `- Total Deals: ${context.totalDeals} (Pipeline Value: ${context.totalDealValue})\n\n`;

    if (context.funnelStages && Object.keys(context.funnelStages).length > 0) {
      prompt += `### Funnel Distribution\n`;
      Object.entries(context.funnelStages).forEach(([stage, count]) => {
        prompt += `- ${stage}: ${count} contacts\n`;
      });
      prompt += "\n";
    }

    if (context.topContacts?.length > 0) {
      prompt += `### Key Contacts\n`;
      context.topContacts.forEach((c: any) => {
        prompt += `- ${c.name}${c.company ? ` (${c.company})` : ""}${c.title ? ` — ${c.title}` : ""}${c.email ? ` <${c.email}>` : ""}\n`;
      });
      prompt += "\n";
    }

    if (context.deals?.length > 0) {
      prompt += `### Active Deals\n`;
      context.deals.forEach((d: any) => {
        prompt += `- ${d.name}: ${d.value}, ${d.probability} probability, closes ${d.expectedClose}`;
        if (d.notes) prompt += ` — "${d.notes}"`;
        prompt += "\n";
      });
      prompt += "\n";
    }

    if (context.recentNotes?.length > 0) {
      prompt += `### Recent CRM Notes\n`;
      context.recentNotes.forEach((n: any) => {
        prompt += `- [${n.entityType}] ${n.author ? `by ${n.author}` : ""} on ${n.date}: "${n.content}"\n`;
      });
      prompt += "\n";
    }

    if (context.recentChatMessages?.length > 0) {
      prompt += `### Recent Team Chat\n`;
      context.recentChatMessages.forEach((m: any) => {
        prompt += `- [${m.channel}] ${m.author}: "${m.content}"\n`;
      });
      prompt += "\n";
    }
  }

  // Inject entity-specific context if provided
  if (entityContext) {
    prompt += `## Current Entity Context\n`;
    prompt += `Type: ${entityContext.type}\n`;
    if (entityContext.name) prompt += `Name: ${entityContext.name}\n`;
    if (entityContext.company) prompt += `Company: ${entityContext.company}\n`;
    if (entityContext.title) prompt += `Title: ${entityContext.title}\n`;
    if (entityContext.industry) prompt += `Industry: ${entityContext.industry}\n`;
    if (entityContext.notes?.length) {
      prompt += `Notes:\n${entityContext.notes.map(n => `  - ${n}`).join("\n")}\n`;
    }
    prompt += "\n";
  }

  prompt += `Today's date: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n`;

  return prompt;
}

// ─── Main brain call ─────────────────────────────────────────────────────────

export async function callBrain(params: BrainCallParams): Promise<BrainCallResult> {
  const {
    tenantId,
    userId,
    persona,
    messages,
    entityContext,
    extractMemories = true,
    lightweightMode = false,
  } = params;

  // Load CRM context and memories in parallel
  const [context, memories] = await Promise.all([
    lightweightMode ? Promise.resolve(null) : gatherCRMContext(tenantId),
    getMemoriesForTenant(tenantId),
  ]);

  const systemPrompt = buildSystemPrompt(persona, context, memories, entityContext);

  const llmMessages: BrainMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await invokeLLM({ messages: llmMessages as any });
  const content = response.choices[0]?.message?.content;
  const aiResponse = typeof content === "string" ? content : "I couldn't generate a response. Please try again.";

  // Asynchronously extract and store new memories (non-blocking)
  if (extractMemories) {
    const lastUserMessage = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";
    if (lastUserMessage) {
      extractAndStoreMemories({
        tenantId,
        userId,
        userMessage: lastUserMessage,
        aiResponse,
      }).catch(err => console.error(`[sharedAIBrain:${persona}] Memory extraction error:`, err));
    }
  }

  return { response: aiResponse, persona };
}

/**
 * Convenience wrapper for single-turn AI calls (no conversation history needed).
 * Used by email generator, lead scoring insights, sequence generator, etc.
 */
export async function askBrain(params: {
  tenantId: string;
  userId: string;
  persona: AIPersona;
  prompt: string;
  entityContext?: BrainCallParams["entityContext"];
  lightweightMode?: boolean;
}): Promise<string> {
  const result = await callBrain({
    tenantId: params.tenantId,
    userId: params.userId,
    persona: params.persona,
    messages: [{ role: "user", content: params.prompt }],
    entityContext: params.entityContext,
    extractMemories: false, // Single-turn calls don't need memory extraction
    lightweightMode: params.lightweightMode ?? false,
  });
  return result.response;
}
