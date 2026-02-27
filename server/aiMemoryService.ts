/**
 * AI Persistent Memory Service
 *
 * Handles extraction, storage, and retrieval of AI memories.
 * The AI learns from every conversation and accumulates knowledge
 * about contacts, deals, team preferences, and business context.
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { aiMemory } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface MemoryItem {
  id: string;
  category: string;
  content: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  importance: number;
  reinforceCount: number;
  source: string;
  createdAt: Date;
}

/**
 * Retrieve all memories for a tenant, ordered by importance and recency.
 * Used to inject into the AI system prompt.
 */
export async function getMemoriesForTenant(tenantId: string, limit = 60): Promise<MemoryItem[]> {
  const db = await getDb();
  if (!db) return [];

  const memories = await db
    .select()
    .from(aiMemory)
    .where(eq(aiMemory.tenantId, tenantId))
    .orderBy(desc(aiMemory.importance), desc(aiMemory.updatedAt))
    .limit(limit);

  return memories as MemoryItem[];
}

/**
 * Store a new memory or reinforce an existing similar one.
 */
export async function storeMemory(params: {
  tenantId: string;
  userId?: string;
  category: string;
  content: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  importance?: number;
  source?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check for a very similar existing memory to avoid duplication
  // Simple dedup: check if content is nearly identical (first 80 chars match)
  const contentPrefix = params.content.substring(0, 80);
  const existing = await db
    .select()
    .from(aiMemory)
    .where(
      and(
        eq(aiMemory.tenantId, params.tenantId),
        eq(aiMemory.category, params.category),
        sql`LEFT(${aiMemory.content}, 80) = ${contentPrefix}`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Reinforce existing memory — increase importance and count
    await db
      .update(aiMemory)
      .set({
        reinforceCount: existing[0].reinforceCount + 1,
        importance: Math.min(10, existing[0].importance + 1),
        updatedAt: new Date(),
      })
      .where(eq(aiMemory.id, existing[0].id));
    return;
  }

  // Store new memory
  await db.insert(aiMemory).values({
    id: randomUUID(),
    tenantId: params.tenantId,
    userId: params.userId || null,
    category: params.category,
    content: params.content,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    entityName: params.entityName || null,
    importance: params.importance ?? 5,
    reinforceCount: 1,
    source: params.source ?? "ai_extracted",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * After each AI conversation turn, extract new memories from the exchange.
 * This is called asynchronously so it doesn't slow down the response.
 */
export async function extractAndStoreMemories(params: {
  tenantId: string;
  userId: string;
  userMessage: string;
  aiResponse: string;
}): Promise<void> {
  const { tenantId, userId, userMessage, aiResponse } = params;

  try {
    const extractionPrompt = `You are a memory extraction system for a CRM AI assistant. 
Your job is to identify important facts, preferences, and insights from a conversation that should be remembered for future sessions.

USER MESSAGE: "${userMessage}"
AI RESPONSE: "${aiResponse}"

Extract up to 5 distinct memories from this exchange. Only extract genuinely useful, specific facts — not generic statements.

For each memory, output a JSON object with these fields:
- category: one of: "contact_insight" | "deal_insight" | "business_context" | "team_preference" | "user_preference" | "key_decision" | "follow_up_pattern" | "general"
- content: a concise, self-contained factual statement (max 200 chars). Write it as a fact, e.g. "Ian prefers to follow up with prospects on Tuesdays" or "The deal with Acme Corp is at risk due to no contact in 3 weeks"
- entityType: "contact" | "deal" | "account" | "user" | null
- entityName: the name of the entity if applicable, or null
- importance: integer 1-10 (10 = critical business fact, 1 = minor preference)

Return ONLY a valid JSON array. If nothing worth remembering was said, return an empty array [].
Example: [{"category":"user_preference","content":"Ian prefers concise bullet-point summaries over long paragraphs","entityType":null,"entityName":null,"importance":6}]`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw || typeof raw !== "string") return;

    // Parse the JSON array
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const memories: Array<{
      category: string;
      content: string;
      entityType: string | null;
      entityName: string | null;
      importance: number;
    }> = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(memories) || memories.length === 0) return;

    // Store each extracted memory
    for (const mem of memories.slice(0, 5)) {
      if (!mem.content || !mem.category) continue;
      await storeMemory({
        tenantId,
        userId,
        category: mem.category,
        content: mem.content,
        entityType: mem.entityType || undefined,
        entityName: mem.entityName || undefined,
        importance: mem.importance ?? 5,
        source: "ai_extracted",
      });
    }
  } catch (err) {
    // Memory extraction is non-critical — log and continue
    console.error("[aiMemoryService] Memory extraction failed:", err);
  }
}

/**
 * Allow users to explicitly tell the AI to remember something.
 * Called when the user says "remember that..." or similar.
 */
export async function storeUserStatedMemory(params: {
  tenantId: string;
  userId: string;
  content: string;
}): Promise<void> {
  await storeMemory({
    tenantId: params.tenantId,
    userId: params.userId,
    category: "user_preference",
    content: params.content,
    importance: 8,
    source: "user_stated",
  });
}

/**
 * Delete a specific memory by ID.
 */
export async function deleteMemory(memoryId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(aiMemory)
    .where(and(eq(aiMemory.id, memoryId), eq(aiMemory.tenantId, tenantId)));
}

/**
 * Get all memories for display in the UI (memory management page).
 */
export async function getAllMemories(tenantId: string): Promise<MemoryItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiMemory)
    .where(eq(aiMemory.tenantId, tenantId))
    .orderBy(desc(aiMemory.importance), desc(aiMemory.updatedAt)) as Promise<MemoryItem[]>;
}

/**
 * Format memories for injection into the AI system prompt.
 */
export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (memories.length === 0) {
    return "No persistent memories yet — this is the AI's first session.";
  }

  // Group by category
  const grouped: Record<string, MemoryItem[]> = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category].push(mem);
  }

  const categoryLabels: Record<string, string> = {
    contact_insight: "Contact Insights",
    deal_insight: "Deal Insights",
    business_context: "Business Context",
    team_preference: "Team Preferences",
    user_preference: "User Preferences",
    key_decision: "Key Decisions",
    follow_up_pattern: "Follow-up Patterns",
    general: "General Knowledge",
  };

  const lines: string[] = [];
  for (const [cat, items] of Object.entries(grouped)) {
    const label = categoryLabels[cat] || cat;
    lines.push(`**${label}:**`);
    for (const item of items.slice(0, 10)) {
      const entity = item.entityName ? ` [re: ${item.entityName}]` : "";
      lines.push(`- ${item.content}${entity}`);
    }
  }

  return lines.join("\n");
}
