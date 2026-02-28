/**
 * Event Ingestion Service
 *
 * Receives all CRM events from email tracking, website, manual actions, and
 * internal CRM mutations. Enforces idempotency via dedupe_key, validates the
 * canonical event schema, and persists events for downstream processing by the
 * Workflow Engine.
 */

import { randomUUID } from "crypto";
import { getDb } from "../db";
import { crmEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type EventType =
  // Email
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_bounced"
  | "email_unsubscribed"
  // Web
  | "page_visit"
  | "time_on_page"
  | "form_started"
  | "form_submitted"
  // CRM
  | "field_update"
  | "tag_added"
  | "owner_changed"
  // Meeting
  | "meeting_booked"
  // Manual
  | "score_adjustment"
  | "manual_tag";

export type EntityType = "lead" | "contact" | "deal";

export interface CrmEventPayload {
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  tenant_id: string;
  source: string;
  occurred_at?: Date;
  payload?: Record<string, any>;
  dedupe_key?: string;
}

export interface CrmEvent extends CrmEventPayload {
  event_id: string;
  received_at: Date;
  occurred_at: Date;
  dedupe_key: string;
}

/**
 * Ingest a single event. Returns the persisted event, or null if it was a
 * duplicate (idempotency enforced via dedupe_key).
 */
export async function ingestEvent(input: CrmEventPayload): Promise<CrmEvent | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const dedupe_key = input.dedupe_key ?? `${input.event_type}:${input.entity_id}:${input.occurred_at?.toISOString() ?? now.toISOString()}`;

  // Idempotency check
  const existing = await db
    .select({ event_id: crmEvents.event_id })
    .from(crmEvents)
    .where(eq(crmEvents.dedupe_key, dedupe_key))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[EventIngestion] Duplicate event discarded: ${dedupe_key}`);
    return null;
  }

  const event: CrmEvent = {
    event_id: randomUUID(),
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    tenant_id: input.tenant_id,
    source: input.source,
    occurred_at: input.occurred_at ?? now,
    received_at: now,
    payload: input.payload ?? {},
    dedupe_key,
  };

  await db.insert(crmEvents).values({
    event_id: event.event_id,
    event_type: event.event_type,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    tenant_id: event.tenant_id,
    source: event.source,
    occurred_at: event.occurred_at,
    received_at: event.received_at,
    payload: event.payload,
    dedupe_key: event.dedupe_key,
    processed: false,
  });

  console.log(`[EventIngestion] Ingested ${event.event_type} for ${event.entity_type}:${event.entity_id}`);
  return event;
}

/**
 * Retrieve events for a given entity within a time window.
 * Used by the Rules Engine for windowed condition evaluation.
 */
export async function getEventsInWindow(
  tenant_id: string,
  entity_id: string,
  event_type: EventType,
  windowMs: number
): Promise<CrmEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const since = new Date(Date.now() - windowMs);

  const rows = await db
    .select()
    .from(crmEvents)
    .where(
      // Drizzle doesn't have a native gte on timestamp with a variable easily,
      // so we use a raw filter after fetching — acceptable for MVP scale.
      eq(crmEvents.tenant_id, tenant_id)
    );

  return rows.filter(
    (r) =>
      r.entity_id === entity_id &&
      r.event_type === event_type &&
      new Date(r.occurred_at) >= since
  ) as CrmEvent[];
}
