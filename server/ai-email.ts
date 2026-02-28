/**
 * ai-email.ts
 *
 * Email generation powered by the shared AI brain.
 * The email writer persona has access to full CRM context + persistent memory,
 * so it knows the team's communication style, client preferences, and deal history.
 */

import { askBrain } from "./sharedAIBrain";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

/**
 * Generate email content using the shared AI brain (email_writer persona)
 */
export async function generateEmail(params: {
  tenantId: string;
  userId?: string;
  contactId?: string;
  dealId?: string;
  accountId?: string;
  purpose: string;
  tone?: string;
  additionalContext?: string;
  bestPracticeExamples?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build entity context from the specific contact/deal/account
  let entityContext: any = undefined;
  let notesForEntity: string[] = [];

  if (params.contactId) {
    const { people, notes } = await import("../drizzle/schema");
    const [contact, entityNotes] = await Promise.all([
      db.select().from(people).where(eq(people.id, params.contactId)).limit(1),
      db.select().from(notes).where(eq(notes.entityId, params.contactId)).limit(5),
    ]);
    if (contact[0]) {
      entityContext = {
        type: "contact" as const,
        name: `${contact[0].firstName || ""} ${contact[0].lastName || ""}`.trim(),
        company: contact[0].companyName || undefined,
        title: contact[0].roleTitle || undefined,
        industry: contact[0].industry || undefined,
      };
      notesForEntity = entityNotes.map(n => n.content);
    }
  } else if (params.dealId) {
    const { deals, dealStages, notes } = await import("../drizzle/schema");
    const [deal, entityNotes] = await Promise.all([
      db.select().from(deals).where(eq(deals.id, params.dealId)).limit(1),
      db.select().from(notes).where(eq(notes.entityId, params.dealId)).limit(5),
    ]);
    if (deal[0]) {
      const stage = await db.select().from(dealStages).where(eq(dealStages.id, deal[0].stageId)).limit(1);
      entityContext = {
        type: "deal" as const,
        name: deal[0].name,
        company: deal[0].accountName || undefined,
      };
      notesForEntity = entityNotes.map(n => n.content);
      if (deal[0].value) notesForEntity.unshift(`Deal value: GBP ${parseFloat(deal[0].value).toLocaleString()}`);
      if (stage[0]) notesForEntity.unshift(`Current stage: ${stage[0].name}`);
    }
  } else if (params.accountId) {
    const { accounts, notes } = await import("../drizzle/schema");
    const [account, entityNotes] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.id, params.accountId)).limit(1),
      db.select().from(notes).where(eq(notes.entityId, params.accountId)).limit(5),
    ]);
    if (account[0]) {
      entityContext = {
        type: "account" as const,
        name: account[0].name,
        company: account[0].name,
        industry: account[0].industry || undefined,
      };
      notesForEntity = entityNotes.map(n => n.content);
      if (account[0].employees) notesForEntity.unshift(`Company size: ${account[0].employees} employees`);
      if (account[0].headquarters) notesForEntity.unshift(`Location: ${account[0].headquarters}`);
    }
  }

  if (entityContext && notesForEntity.length > 0) {
    entityContext.notes = notesForEntity;
  }

  // Load best practice examples if provided
  let bestPracticesSection = "";
  if (params.bestPracticeExamples && params.bestPracticeExamples.length > 0) {
    const { emailExamples } = await import("../drizzle/schema");
    const examples = await db.select().from(emailExamples)
      .where(eq(emailExamples.id, params.bestPracticeExamples[0]))
      .limit(3);
    if (examples.length > 0) {
      bestPracticesSection = "\n\nBest Practice Examples (use these for tone and structure inspiration):\n";
      examples.forEach((ex, idx) => {
        bestPracticesSection += `\nExample ${idx + 1}:\nSubject: ${ex.subject}\nBody: ${ex.body}\n`;
        if (ex.context) bestPracticesSection += `Context: ${ex.context}\n`;
      });
    }
  }

  const userPrompt = `Write an email for the following purpose: ${params.purpose}

Desired tone: ${params.tone || "professional"}
${params.additionalContext ? `Additional context: ${params.additionalContext}\n` : ""}${bestPracticesSection}

Generate a subject line and email body. Format your response as:
SUBJECT: [subject line]
BODY: [email body]`;

  const rawResponse = await askBrain({
    tenantId: params.tenantId,
    userId: params.userId || "system",
    persona: "email_writer",
    prompt: userPrompt,
    entityContext,
    lightweightMode: false, // Full brain context for email writing
  });

  const subjectMatch = rawResponse.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = rawResponse.match(/BODY:\s*([\s\S]+)/i);

  return {
    subject: subjectMatch?.[1]?.trim() || "",
    body: bodyMatch?.[1]?.trim() || rawResponse,
  };
}

/**
 * Improve an existing email draft using the shared AI brain
 */
export async function improveEmail(params: {
  tenantId?: string;
  userId?: string;
  subject: string;
  body: string;
  improvementType: "clarity" | "tone" | "length" | "cta" | "personalization";
  targetTone?: string;
}) {
  const improvementInstructions = {
    clarity: "Make this email clearer and easier to understand. Remove jargon and simplify complex sentences.",
    tone: `Adjust the tone of this email to be more ${params.targetTone || "professional"}.`,
    length: "Make this email more concise while keeping all key points.",
    cta: "Strengthen the call-to-action to make it more compelling and specific.",
    personalization: "Make this email feel more personal and less like a template. Add warmth and specificity.",
  };

  const userPrompt = `${improvementInstructions[params.improvementType]}

CURRENT EMAIL:
Subject: ${params.subject}
Body: ${params.body}

Provide the improved version in the same format:
SUBJECT: [improved subject]
BODY: [improved body]`;

  const rawResponse = await askBrain({
    tenantId: params.tenantId || "0",
    userId: params.userId || "system",
    persona: "email_writer",
    prompt: userPrompt,
    lightweightMode: true, // Improvement doesn't need full CRM context
  });

  const subjectMatch = rawResponse.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = rawResponse.match(/BODY:\s*([\s\S]+)/i);

  return {
    subject: subjectMatch?.[1]?.trim() || params.subject,
    body: bodyMatch?.[1]?.trim() || rawResponse,
  };
}
