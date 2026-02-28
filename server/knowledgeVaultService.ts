/**
 * knowledgeVaultService.ts
 *
 * Handles ingestion of files, URLs, and other knowledge sources into the AI brain.
 * Supports: PDF, DOCX, plain text, URLs (web scraping), audio/video (transcript via Whisper),
 * images (OCR via GPT-4V), and raw text pastes.
 *
 * After extraction, content is:
 * 1. Stored in the knowledgeVault table
 * 2. Summarised by the AI
 * 3. Key memories extracted and injected into aiMemory
 */

import { getDb } from "./db";
import { knowledgeVault, aiMemory } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { OpenAI } from "openai";
import { storagePut, storageGet } from "./storage";
import { ENV } from "./_core/env";

function createOpenAIClient() {
  const opts: ConstructorParameters<typeof OpenAI>[0] = {};
  if (ENV.forgeApiKey) opts.apiKey = ENV.forgeApiKey;
  if (ENV.forgeApiUrl) opts.baseURL = `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1`;
  return new OpenAI(opts);
}

const openai = createOpenAIClient();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IngestOptions {
  tenantId: string;
  userId: string;
  title: string;
  category?: string;
  tags?: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
  linkedEntityName?: string;
}

export interface IngestFileOptions extends IngestOptions {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface IngestUrlOptions extends IngestOptions {
  url: string;
}

export interface IngestTextOptions extends IngestOptions {
  text: string;
}

// ─────────────────────────────────────────────
// Text extraction helpers
// ─────────────────────────────────────────────

async function extractFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Use OpenAI to extract text from PDF (no native deps required)
    const openai = createOpenAIClient();
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this PDF document. Return only the extracted text, preserving structure where possible. Do not add any commentary.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("PDF extraction error:", err);
    // Fallback: try to extract raw text from buffer
    try {
      const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      return text.length > 50 ? text.substring(0, 8000) : "";
    } catch {
      return "";
    }
  }
}

async function extractFromUrl(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NeuroVitalityCRM/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, nav, footer, header, aside, .ad, .advertisement, .cookie-banner").remove();

    const pageTitle = $("title").text().trim() || $("h1").first().text().trim() || url;

    // Extract main content
    const mainContent =
      $("article").text() ||
      $("main").text() ||
      $('[role="main"]').text() ||
      $(".content, .post-content, .entry-content, .article-body").first().text() ||
      $("body").text();

    const cleaned = mainContent
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 50000); // Cap at 50k chars

    return { title: pageTitle, content: cleaned };
  } catch (err) {
    console.error("URL extraction error:", err);
    return { title: url, content: "" };
  }
}

async function extractFromSpreadsheet(buffer: Buffer, fileName: string): Promise<string> {
  try {
    // Try to parse as CSV first (works for .csv and simple .xls)
    const text = buffer.toString("utf-8");
    if (text.includes(",") || text.includes("\t")) {
      // Looks like CSV/TSV — return as-is (AI will parse it)
      return text.slice(0, 100000);
    }
    // For binary Excel files, use AI to describe the content
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{
        role: "user",
        content: `This is an Excel spreadsheet file (${fileName}). The file is encoded in base64 below. Please extract and describe all the data, tables, column headers, and key values you can identify from this file. Return the data in a structured text format.\n\nNote: If you cannot parse the binary data directly, describe what you can infer from the file name and any readable text strings.\n\nFile (base64, first 50KB): ${base64.slice(0, 68000)}`,
      }],
      max_tokens: 3000,
    });
    return response.choices[0]?.message?.content || `Spreadsheet file: ${fileName}`;
  } catch (err) {
    console.error("Spreadsheet extraction error:", err);
    // Fallback: extract readable strings
    const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    return text.length > 50 ? text.slice(0, 50000) : `Spreadsheet file: ${fileName}`;
  }
}

async function extractFromPresentation(buffer: Buffer, fileName: string): Promise<string> {
  try {
    // Try to extract readable text from PPTX (which is a ZIP file containing XML)
    const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    // PPTX files contain XML with slide text — extract readable portions
    const xmlMatches = text.match(/<a:t>[^<]{2,}<\/a:t>/g) || [];
    if (xmlMatches.length > 0) {
      const slideText = xmlMatches
        .map(m => m.replace(/<[^>]+>/g, "").trim())
        .filter(t => t.length > 1)
        .join("\n");
      if (slideText.length > 50) return slideText.slice(0, 100000);
    }
    // Fallback: use AI to describe
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{
        role: "user",
        content: `This is a PowerPoint presentation file (${fileName}). Please extract all slide text, titles, bullet points, and key content you can identify. Return the content slide by slide in plain text format.\n\nFile (base64, first 50KB): ${base64.slice(0, 68000)}`,
      }],
      max_tokens: 3000,
    });
    return response.choices[0]?.message?.content || `Presentation file: ${fileName}`;
  } catch (err) {
    console.error("Presentation extraction error:", err);
    const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    return text.length > 50 ? text.slice(0, 50000) : `Presentation file: ${fileName}`;
  }
}

async function extractFromAudioVideo(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  try {
    // Use OpenAI Whisper for transcription
    const blob = new Blob([buffer], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "text",
    });

    return typeof transcription === "string" ? transcription : (transcription as any).text || "";
  } catch (err) {
    console.error("Audio/video transcription error:", err);
    return "";
  }
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and transcribe all text visible in this image. Include any important visual information, charts, tables, or diagrams described in plain text.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });
    return response.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("Image OCR error:", err);
    return "";
  }
}

// ─────────────────────────────────────────────
// AI processing: summarise + extract memories
// ─────────────────────────────────────────────

async function processWithAI(params: {
  title: string;
  content: string;
  category?: string;
  linkedEntityName?: string;
  tenantId: string;
}): Promise<{ summary: string; memories: Array<{ category: string; content: string; importance: number }> }> {
  const contextHint = params.linkedEntityName
    ? `This content is related to: ${params.linkedEntityName}.`
    : "";

  const categoryHint = params.category
    ? `Category: ${params.category}.`
    : "";

  const prompt = `You are analysing a knowledge document for a CRM system.

Title: ${params.title}
${categoryHint}
${contextHint}

Content (truncated to 8000 chars):
${params.content.slice(0, 8000)}

Please provide:

1. A concise summary (2-4 sentences) of what this document contains and why it's valuable.

2. A list of 3-10 key learnings, facts, or insights that should be stored as persistent AI memory. These should be actionable, specific, and useful for future sales, communication, or strategy decisions.

Respond in this exact JSON format:
{
  "summary": "...",
  "memories": [
    { "category": "won_deal_pattern|lost_deal_pattern|content_insight|competitor_intel|communication_preference|business_context|product_knowledge|general", "content": "...", "importance": 7 },
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      summary: result.summary || "No summary available.",
      memories: Array.isArray(result.memories) ? result.memories : [],
    };
  } catch (err) {
    console.error("AI processing error:", err);
    return { summary: "Processing failed.", memories: [] };
  }
}

// ─────────────────────────────────────────────
// Core ingestion function
// ─────────────────────────────────────────────

async function finaliseIngestion(params: {
  vaultId: string;
  tenantId: string;
  userId: string;
  title: string;
  extractedContent: string;
  category?: string;
  linkedEntityName?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vaultId, tenantId, userId, title, extractedContent, category, linkedEntityName } = params;
  if (!extractedContent || extractedContent.length < 10) {
    await db.update(knowledgeVault)
      .set({ status: "failed", processingError: "No content could be extracted.", updatedAt: new Date() })
      .where(eq(knowledgeVault.id, vaultId));
    return;
  }

  // AI processing
  const { summary, memories } = await processWithAI({
    title,
    content: extractedContent,
    category,
    linkedEntityName,
    tenantId,
  });

  // Store memories in aiMemory table
  const memoryIds: string[] = [];
  for (const mem of memories) {
    const memId = randomUUID();
    memoryIds.push(memId);
    await db.insert(aiMemory).values({
      id: memId,
      tenantId,
      userId,
      category: mem.category || "general",
      content: mem.content,
      importance: Math.min(10, Math.max(1, mem.importance || 5)),
      source: "knowledge_vault",
      entityType: "knowledge_vault",
      entityId: vaultId,
      entityName: title,
    }).onConflictDoNothing();
  }

  // Update vault record
  await db.update(knowledgeVault)
    .set({
      extractedContent: extractedContent.slice(0, 100000), // Store up to 100k chars
      aiSummary: summary,
      extractedMemories: JSON.stringify(memories),
      status: "ready",
      memoryInjected: true,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeVault.id, vaultId));
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function ingestFile(options: IngestFileOptions): Promise<{ vaultId: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tenantId, userId, title, category, tags, linkedEntityType, linkedEntityId, linkedEntityName,
    fileBuffer, fileName, mimeType, fileSize } = options;

  const vaultId = randomUUID();
  const storageKey = `knowledge-vault/${tenantId}/${vaultId}/${fileName}`;

  // Upload file to storage
  let storageUrl: string | undefined;
  try {
    const result = await storagePut(storageKey, fileBuffer, mimeType);
    storageUrl = result.url;
  } catch (err) {
    console.error("Storage upload error:", err);
  }

  // Create vault record immediately (status: processing)
  await db.insert(knowledgeVault).values({
    id: vaultId,
    tenantId,
    uploadedByUserId: userId,
    sourceType: getSourceType(mimeType, fileName),
    title,
    storageKey,
    sourceUrl: storageUrl,
    fileName,
    fileSize,
    mimeType,
    category: category || "general",
    tags: tags ? JSON.stringify(tags) : null,
    linkedEntityType,
    linkedEntityId,
    linkedEntityName,
    status: "processing",
  });

  // Extract content asynchronously
  setImmediate(async () => {
    try {
      let extractedContent = "";
      const sourceType = getSourceType(mimeType, fileName);

      if (sourceType === "pdf") {
        extractedContent = await extractFromPdf(fileBuffer);
      } else if (sourceType === "audio" || sourceType === "video") {
        extractedContent = await extractFromAudioVideo(fileBuffer, mimeType, fileName);
      } else if (sourceType === "image") {
        extractedContent = await extractFromImage(fileBuffer, mimeType);
      } else if (sourceType === "spreadsheet") {
        extractedContent = await extractFromSpreadsheet(fileBuffer, fileName);
      } else if (sourceType === "presentation") {
        extractedContent = await extractFromPresentation(fileBuffer, fileName);
      } else if (sourceType === "text" || sourceType === "doc") {
        // Plain text, CSV, DOCX (try as text first, AI will handle structure)
        extractedContent = fileBuffer.toString("utf-8").slice(0, 100000);
      } else {
        // Try as text
        extractedContent = fileBuffer.toString("utf-8").slice(0, 100000);
      }

      await finaliseIngestion({ vaultId, tenantId, userId, title, extractedContent, category, linkedEntityName });
    } catch (err) {
      console.error("Ingestion error:", err);
      await db.update(knowledgeVault)
        .set({ status: "failed", processingError: String(err), updatedAt: new Date() })
        .where(eq(knowledgeVault.id, vaultId));
    }
  });

  return { vaultId };
}

export async function ingestUrl(options: IngestUrlOptions): Promise<{ vaultId: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tenantId, userId, url, category, tags, linkedEntityType, linkedEntityId, linkedEntityName } = options;

  const vaultId = randomUUID();

  // Create vault record
  await db.insert(knowledgeVault).values({
    id: vaultId,
    tenantId,
    uploadedByUserId: userId,
    sourceType: "url",
    title: options.title || url,
    sourceUrl: url,
    category: category || "general",
    tags: tags ? JSON.stringify(tags) : null,
    linkedEntityType,
    linkedEntityId,
    linkedEntityName,
    status: "processing",
  });

  // Extract asynchronously
  setImmediate(async () => {
    try {
      const { title: pageTitle, content } = await extractFromUrl(url);

      // Update title if not provided
      if (!options.title || options.title === url) {
        await db.update(knowledgeVault)
          .set({ title: pageTitle })
          .where(eq(knowledgeVault.id, vaultId));
      }

      await finaliseIngestion({
        vaultId, tenantId, userId,
        title: options.title || pageTitle,
        extractedContent: content,
        category,
        linkedEntityName,
      });
    } catch (err) {
      console.error("URL ingestion error:", err);
      await db.update(knowledgeVault)
        .set({ status: "failed", processingError: String(err), updatedAt: new Date() })
        .where(eq(knowledgeVault.id, vaultId));
    }
  });

  return { vaultId };
}

export async function ingestText(options: IngestTextOptions): Promise<{ vaultId: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { tenantId, userId, title, text, category, tags, linkedEntityType, linkedEntityId, linkedEntityName } = options;

  const vaultId = randomUUID();

  await db.insert(knowledgeVault).values({
    id: vaultId,
    tenantId,
    uploadedByUserId: userId,
    sourceType: "text",
    title,
    category: category || "general",
    tags: tags ? JSON.stringify(tags) : null,
    linkedEntityType,
    linkedEntityId,
    linkedEntityName,
    status: "processing",
  });

  setImmediate(async () => {
    try {
      await finaliseIngestion({ vaultId, tenantId, userId, title, extractedContent: text, category, linkedEntityName });
    } catch (err) {
      await db.update(knowledgeVault)
        .set({ status: "failed", processingError: String(err), updatedAt: new Date() })
        .where(eq(knowledgeVault.id, vaultId));
    }
  });

  return { vaultId };
}

export async function deleteVaultEntry(vaultId: string, tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove associated memories
  await db.delete(aiMemory)
    .where(and(eq(aiMemory.entityType, "knowledge_vault"), eq(aiMemory.entityId, vaultId)));

  // Remove vault entry
  await db.delete(knowledgeVault)
    .where(and(eq(knowledgeVault.id, vaultId), eq(knowledgeVault.tenantId, tenantId)));
}

export async function getVaultEntries(tenantId: string, filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const entries = await db.select().from(knowledgeVault)
    .where(eq(knowledgeVault.tenantId, tenantId))
    .orderBy(knowledgeVault.createdAt);

  let results = entries;

  if (filters?.category) {
    results = results.filter(e => e.category === filters.category);
  }
  if (filters?.status) {
    results = results.filter(e => e.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.aiSummary?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }

  return results.map(e => ({
    ...e,
    tags: e.tags ? JSON.parse(e.tags) : [],
    extractedMemories: e.extractedMemories ? JSON.parse(e.extractedMemories) : [],
    // Don't return full extracted content in list view
    extractedContent: e.extractedContent ? `${e.extractedContent.slice(0, 200)}...` : null,
  }));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getSourceType(mimeType: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (mimeType.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm", "wmv"].includes(ext)) return "video";
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext) || mimeType.includes("wordprocessingml") || mimeType === "application/msword") return "doc";
  if (["xls", "xlsx"].includes(ext) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext) || mimeType.includes("presentationml") || mimeType.includes("powerpoint")) return "presentation";
  if (["txt", "md", "csv", "json", "xml"].includes(ext)) return "text";
  return "text";
}

// ─────────────────────────────────────────────
// Load vault knowledge into AI context
// ─────────────────────────────────────────────

export async function getVaultContextForAI(tenantId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const entries = await db.select({
      title: knowledgeVault.title,
      category: knowledgeVault.category,
      aiSummary: knowledgeVault.aiSummary,
      linkedEntityName: knowledgeVault.linkedEntityName,
      createdAt: knowledgeVault.createdAt,
    })
      .from(knowledgeVault)
      .where(and(
        eq(knowledgeVault.tenantId, tenantId),
        eq(knowledgeVault.status, "ready")
      ));

    if (entries.length === 0) return "";

    const lines = entries.map(e => {
      const entity = e.linkedEntityName ? ` [related to: ${e.linkedEntityName}]` : "";
      return `- [${e.category || "general"}] "${e.title}"${entity}: ${e.aiSummary || "No summary"}`;
    });

    return `\n## Knowledge Vault (${entries.length} documents)\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}
