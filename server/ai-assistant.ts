import { getDb } from "./db";
import { threads, people, nextActions, moments } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { computeFunnelStage } from "./funnel";

/**
 * AI Assistant for CRM Insights
 * 
 * Provides intelligent answers to questions about:
 * - Deal health and pipeline status
 * - Contact engagement and follow-ups
 * - Action items and overdue tasks
 * - Funnel analytics and metrics
 */

export interface AssistantContext {
  tenantId: string;
  userId: string;
}

export interface AssistantResponse {
  answer: string;
  links: Array<{
    type: "person" | "thread" | "action";
    id: number;
    label: string;
    url: string;
  }>;
  data?: any;
}

/**
 * Process a user query and generate an intelligent response
 */
export async function processAssistantQuery(
  query: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gather relevant CRM data
  const crmData = await gatherCRMData(context.tenantId, context.userId);

  // Build system prompt with CRM context
  const systemPrompt = buildSystemPrompt(crmData);

  // Call LLM to generate response
  const llmResponse = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "assistant_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "Natural language answer to the user's question",
            },
            relevant_threads: {
              type: "array",
              description: "Thread IDs mentioned in the answer",
              items: { type: "number" },
            },
            relevant_people: {
              type: "array",
              description: "Person IDs mentioned in the answer",
              items: { type: "number" },
            },
            relevant_actions: {
              type: "array",
              description: "Action IDs mentioned in the answer",
              items: { type: "number" },
            },
          },
          required: ["answer", "relevant_threads", "relevant_people", "relevant_actions"],
          additionalProperties: false,
        },
      },
    },
  });

  const messageContent = llmResponse.choices[0]?.message?.content;
  const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
  const parsed = JSON.parse(contentString || "{}");

  // Generate clickable links
  const links = await generateLinks(
    {
      threads: parsed.relevant_threads || [],
      people: parsed.relevant_people || [],
      actions: parsed.relevant_actions || [],
    },
    context.tenantId
  );

  return {
    answer: parsed.answer || "I couldn't process that question. Could you rephrase it?",
    links,
    data: crmData,
  };
}

/**
 * Gather relevant CRM data for context
 */
async function gatherCRMData(tenantId: string, userId: string) {
  const db = await getDb();
  if (!db) return {};

  // Get all threads with computed funnel stages
  const allThreads = await db
    .select()
    .from(threads)
    .where(eq(threads.tenantId, tenantId))
    .limit(100);

  const threadsWithStages = await Promise.all(
    allThreads.map(async (thread) => {
      // Get moments and actions for this thread
      const threadMoments = await db
        .select()
        .from(moments)
        .where(eq(moments.threadId, thread.id));
      const threadActions = await db
        .select()
        .from(nextActions)
        .where(eq(nextActions.threadId, thread.id));
      
      const stage = computeFunnelStage(thread as any, threadMoments as any[], threadActions as any[]);
      return { ...thread, funnelStage: stage };
    })
  );

  // Get overdue actions
  const now = new Date();
  const overdueActions = await db
    .select()
    .from(nextActions)
    .where(
      and(
        eq(nextActions.tenantId, tenantId),
        eq(nextActions.status, "open"),
        lte(nextActions.dueAt, now)
      )
    )
    .orderBy(nextActions.dueAt);

  // Get recent people
  const recentPeople = await db
    .select()
    .from(people)
    .where(eq(people.tenantId, tenantId))
    .orderBy(desc(people.updatedAt))
    .limit(50);

  // Compute funnel distribution
  const funnelDistribution = threadsWithStages.reduce((acc, thread) => {
    const stage = thread.funnelStage || "unknown";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Identify at-risk deals
  const atRiskThreads = threadsWithStages.filter(
    (t) =>
      t.funnelStage &&
      ["engaged", "qualified", "demo_scheduled", "proposal_sent"].includes(t.funnelStage)
  );

  return {
    totalThreads: threadsWithStages.length,
    funnelDistribution,
    overdueActions: overdueActions.length,
    atRiskDeals: atRiskThreads.length,
    recentPeople: recentPeople.length,
    threads: threadsWithStages.slice(0, 20), // Top 20 for context
    atRiskThreadsList: atRiskThreads.slice(0, 10),
    overdueActionsList: overdueActions.slice(0, 10),
  };
}

/**
 * Build system prompt with CRM context
 */
function buildSystemPrompt(crmData: any): string {
  return `You are an AI assistant for a CRM system. You help users understand their sales pipeline, deal health, and action items.

Current CRM State:
- Total active threads: ${crmData.totalThreads}
- Funnel distribution: ${JSON.stringify(crmData.funnelDistribution)}
- Overdue actions: ${crmData.overdueActions}
- At-risk deals: ${crmData.atRiskDeals}
- Recent contacts: ${crmData.recentPeople}

Recent Threads (with funnel stages):
${crmData.threads?.map((t: any) => `- Thread #${t.id}: ${t.summary} (Stage: ${t.funnelStage}, Signal: ${t.dealSignal})`).join("\n")}

At-Risk Deals:
${crmData.atRiskThreadsList?.map((t: any) => `- Thread #${t.id}: ${t.summary} (${t.funnelStage})`).join("\n")}

Overdue Actions:
${crmData.overdueActionsList?.map((a: any) => `- Action #${a.id}: ${a.type} (Thread #${a.threadId}, Due: ${a.dueAt})`).join("\n")}

When answering questions:
1. Be concise and actionable
2. Reference specific thread IDs, person IDs, or action IDs when relevant
3. Provide insights based on the data above
4. If asked about deal health, consider funnel stage and deal signal
5. If asked about follow-ups, reference overdue actions
6. Always include relevant IDs in your response arrays

Answer the user's question based on this CRM data.`;
}

/**
 * Generate clickable links for referenced entities
 */
async function generateLinks(
  refs: { threads: number[]; people: number[]; actions: number[] },
  tenantId: string
): Promise<AssistantResponse["links"]> {
  const db = await getDb();
  if (!db) return [];

  const links: AssistantResponse["links"] = [];

  // Add thread links
  if (refs.threads.length > 0) {
    const threadData = await db
      .select()
      .from(threads)
      .where(and(eq(threads.tenantId, tenantId), sql`${threads.id} IN (${refs.threads.join(",")})`));

    for (const thread of threadData) {
      links.push({
        type: "thread",
        id: parseInt(thread.id),
        label: thread.title || `Thread #${thread.id}`,
        url: `/threads/${thread.id}`,
      });
    }
  }

  // Add person links
  if (refs.people.length > 0) {
    const peopleData = await db
      .select()
      .from(people)
      .where(and(eq(people.tenantId, tenantId), sql`${people.id} IN (${refs.people.join(",")})`));

    for (const person of peopleData) {
      links.push({
        type: "person",
        id: parseInt(person.id),
        label: person.fullName || `Person #${person.id}`,
        url: `/people/${person.id}`,
      });
    }
  }

  // Add action links
  if (refs.actions.length > 0) {
    const actionData = await db
      .select()
      .from(nextActions)
      .where(and(eq(nextActions.tenantId, tenantId), sql`${nextActions.id} IN (${refs.actions.join(",")})`));

    for (const action of actionData) {
      links.push({
        type: "action",
        id: parseInt(action.id),
        label: `${action.triggerType} action`,
        url: `/threads/${action.threadId}`,
      });
    }
  }

  return links;
}
