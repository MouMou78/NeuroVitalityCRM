import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { getDb } from "./db";
import { notes, deals } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function queryAIAssistant(params: {
  tenantId: number;
  userId: number;
  messages: Message[];
}): Promise<string> {
  const { tenantId, messages: conversationMessages } = params;

  // Gather comprehensive CRM context
  const context = await gatherCRMContext(String(tenantId));

  // Build system prompt with full CRM context
  const systemPrompt = buildSystemPrompt(context);

  // Prepare messages for LLM — include full conversation history for memory within session
  const llmMessages: Message[] = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ];

  // Call LLM
  const response = await invokeLLM({
    messages: llmMessages as any,
  });

  const content = response.choices[0].message.content;
  return typeof content === "string"
    ? content
    : "I apologize, but I couldn't generate a response. Please try again.";
}

async function gatherCRMContext(tenantId: string) {
  const dbConn = await getDb();

  // Fetch core CRM data in parallel
  const [people, threads, moments, integrations] = await Promise.all([
    db.getPeopleByTenant(tenantId),
    db.getThreadsByTenant(tenantId),
    db.getMomentsByTenant(tenantId),
    db.getIntegrationsByTenant(tenantId),
  ]);

  // Fetch deals pipeline
  let allDeals: any[] = [];
  if (dbConn) {
    allDeals = await dbConn
      .select()
      .from(deals)
      .where(eq(deals.tenantId, tenantId))
      .orderBy(desc(deals.updatedAt))
      .limit(30);
  }

  // Fetch recent notes across all entities
  let recentNotes: any[] = [];
  if (dbConn) {
    recentNotes = await dbConn
      .select()
      .from(notes)
      .where(eq(notes.tenantId, tenantId))
      .orderBy(desc(notes.createdAt))
      .limit(20);
  }

  // Fetch recent team chat messages from all channels
  let recentChatMessages: any[] = [];
  if (dbConn) {
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

  // Calculate funnel distribution
  const funnelStages: Record<string, number> = {};
  threads.forEach((thread: any) => {
    const stage = thread.funnelStage || "prospected";
    funnelStages[stage] = (funnelStages[stage] || 0) + 1;
  });

  // Calculate engagement metrics
  const totalMoments = moments.length;
  const emailMoments = moments.filter((m: any) => m.type === "email").length;
  const callMoments = moments.filter((m: any) => m.type === "call").length;
  const meetingMoments = moments.filter((m: any) => m.type === "meeting").length;

  // Get recent activity
  const recentMoments = moments
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  // Calculate deal pipeline value
  const totalDealValue = allDeals.reduce(
    (sum: number, d: any) => sum + parseFloat(d.value || "0"),
    0
  );

  return {
    totalContacts: people.length,
    totalThreads: threads.length,
    totalMoments,
    emailMoments,
    callMoments,
    meetingMoments,
    funnelStages,
    recentMoments: recentMoments.map((m: any) => ({
      type: m.type,
      date: m.createdAt,
      summary: m.summary || (m.content?.substring(0, 150) ?? ""),
    })),
    integrations: integrations.map((i: any) => ({
      type: i.type,
      connected: i.apiKey ? true : false,
    })),
    topContacts: people.slice(0, 15).map((p: any) => ({
      name: p.name || p.fullName,
      email: p.email,
      company: p.company,
      title: p.title,
    })),
    // Deals pipeline
    deals: allDeals.slice(0, 20).map((d: any) => ({
      name: d.name,
      value: d.value
        ? `${d.currency || "GBP"} ${parseFloat(d.value).toLocaleString()}`
        : "No value set",
      probability: d.probability ? `${d.probability}%` : "50%",
      expectedClose: d.expectedCloseDate
        ? new Date(d.expectedCloseDate).toLocaleDateString("en-GB")
        : "Not set",
      dealNotes: d.notes ? d.notes.substring(0, 100) : null,
    })),
    totalDealValue: `GBP ${totalDealValue.toLocaleString()}`,
    totalDeals: allDeals.length,
    // Notes from across the CRM
    recentNotes: recentNotes.map((n: any) => ({
      entityType: n.entityType,
      content: n.content.substring(0, 200),
      author: n.createdByName,
      date: new Date(n.createdAt).toLocaleDateString("en-GB"),
    })),
    // Team chat context
    recentChatMessages: recentChatMessages.slice(0, 15).map((m: any) => ({
      channel: m.channel,
      author: m.author,
      content: m.content?.substring(0, 150),
      date: m.date ? new Date(m.date).toLocaleDateString("en-GB") : "",
    })),
  };
}

function buildSystemPrompt(context: any): string {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are the NeuroVitality CRM AI Assistant — an intelligent, always-on business coach and analyst embedded directly into the CRM. Today is ${today}.

You have full visibility into the team's CRM data, deals pipeline, notes, and team conversations. You retain context throughout each conversation and use it to provide personalised, actionable insights.

---

## LIVE CRM DATA

### Contacts & Engagement
- Total Contacts: ${context.totalContacts}
- Total Threads/Opportunities: ${context.totalThreads}
- Total Activities logged: ${context.totalMoments} (${context.emailMoments} emails, ${context.callMoments} calls, ${context.meetingMoments} meetings)

### Funnel Distribution
${Object.entries(context.funnelStages).map(([stage, count]) => `- ${stage}: ${count}`).join("\n") || "- No funnel data yet"}

### Deals Pipeline
- Total Deals: ${context.totalDeals}
- Total Pipeline Value: ${context.totalDealValue}
${
  context.deals.length > 0
    ? context.deals
        .map(
          (d: any) =>
            `- ${d.name} | ${d.value} | ${d.probability} probability | Close: ${d.expectedClose}${d.dealNotes ? ` | Note: ${d.dealNotes}` : ""}`
        )
        .join("\n")
    : "- No deals in pipeline yet"
}

### Recent Notes (across contacts, deals, accounts)
${
  context.recentNotes.length > 0
    ? context.recentNotes
        .map((n: any) => `- [${n.entityType}] ${n.date} by ${n.author}: "${n.content}"`)
        .join("\n")
    : "- No notes recorded yet"
}

### Recent Activity
${
  context.recentMoments.length > 0
    ? context.recentMoments
        .map(
          (m: any) =>
            `- ${m.type} on ${new Date(m.date).toLocaleDateString("en-GB")}: ${m.summary}`
        )
        .join("\n")
    : "- No recent activity"
}

### Team Chat (recent messages)
${
  context.recentChatMessages.length > 0
    ? context.recentChatMessages
        .map((m: any) => `- [#${m.channel}] ${m.author}: "${m.content}" (${m.date})`)
        .join("\n")
    : "- No team chat messages yet"
}

### Connected Integrations
${
  context.integrations.length > 0
    ? context.integrations
        .map((i: any) => `- ${i.type}: ${i.connected ? "Connected" : "Not connected"}`)
        .join("\n")
    : "- No integrations connected"
}

### Top Contacts
${context.topContacts
  .map(
    (c: any) =>
      `- ${c.name || "Unknown"} (${c.email || "no email"}) — ${c.title || "no title"} at ${c.company || "no company"}`
  )
  .join("\n")}

---

## YOUR ROLE & CAPABILITIES

You are always on, always learning, and always available. You:

1. **Answer questions about the CRM data** — contacts, deals, pipeline, activities, notes
2. **Analyse sales performance** — funnel health, deal velocity, at-risk opportunities
3. **Surface insights from team chat** — you read team conversations and can reference what the team has discussed
4. **Remember context within this conversation** — you retain everything discussed so far in this session, and past conversations are saved so you can be asked to recall them
5. **Coach the team** — suggest next best actions, flag overdue follow-ups, identify patterns
6. **Help with writing** — draft emails, proposals, follow-up messages based on CRM context

## GUIDELINES

- Always base answers on the actual data provided above
- Be specific — reference deal names, contact names, dates, and values
- When you spot risks (overdue deals, stale contacts, missed follow-ups), proactively flag them
- Use markdown formatting for clarity (bold key points, use tables for comparisons)
- Keep responses focused and actionable — avoid generic advice
- If asked about something not in your data, say so clearly and suggest how to find it
- Maintain a professional but warm tone — you are a trusted business advisor`;
}
