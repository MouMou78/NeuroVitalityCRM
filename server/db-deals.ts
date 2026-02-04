import { getDb } from "./db";
import { deals, dealStages } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Get all deal stages for a tenant
 */
export async function getDealStagesByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const stages = await db
    .select()
    .from(dealStages)
    .where(eq(dealStages.tenantId, tenantId))
    .orderBy(dealStages.order);

  return stages;
}

/**
 * Create a new deal stage
 */
export async function createDealStage(data: {
  tenantId: string;
  name: string;
  order: number;
  color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(dealStages).values({ id, ...data });

  const result = await db
    .select()
    .from(dealStages)
    .where(eq(dealStages.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get all deals for a tenant
 */
export async function getDealsByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const allDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.tenantId, tenantId))
    .orderBy(desc(deals.createdAt));

  return allDeals;
}

/**
 * Get deals by stage
 */
export async function getDealsByStage(tenantId: string, stageId: string) {
  const db = await getDb();
  if (!db) return [];

  const stageDeals = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.stageId, stageId)))
    .orderBy(desc(deals.createdAt));

  return stageDeals;
}

/**
 * Create a new deal
 */
export async function createDeal(data: {
  tenantId: string;
  name: string;
  value?: string;
  currency?: string;
  stageId: string;
  accountId?: string;
  contactId?: string;
  ownerUserId?: string;
  expectedCloseDate?: Date;
  probability?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(deals).values({ id, ...data });

  const result = await db
    .select()
    .from(deals)
    .where(eq(deals.id, id))
    .limit(1);

  return result[0];
}

/**
 * Update deal stage (for drag-and-drop)
 */
export async function updateDealStage(dealId: string, tenantId: string, newStageId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(deals)
    .set({ stageId: newStageId, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)));

  return { success: true };
}

/**
 * Update deal
 */
export async function updateDeal(
  dealId: string,
  tenantId: string,
  data: Partial<{
    name: string;
    value: string;
    currency: string;
    stageId: string;
    accountId: string;
    contactId: string;
    ownerUserId: string;
    expectedCloseDate: Date;
    probability: number;
    notes: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(deals)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)));

  const result = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  return result[0];
}

/**
 * Delete a deal
 */
export async function deleteDeal(dealId: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)));

  return { success: true };
}

/**
 * Initialize default deal stages for a tenant
 */
export async function initializeDefaultStages(tenantId: string) {
  const defaultStages = [
    { name: "Prospecting", order: 1, color: "#94a3b8" },
    { name: "Qualification", order: 2, color: "#60a5fa" },
    { name: "Proposal", order: 3, color: "#a78bfa" },
    { name: "Negotiation", order: 4, color: "#fb923c" },
    { name: "Closed Won", order: 5, color: "#34d399" },
    { name: "Closed Lost", order: 6, color: "#f87171" },
  ];

  const createdStages = [];
  for (const stage of defaultStages) {
    const created = await createDealStage({ tenantId, ...stage });
    createdStages.push(created);
  }

  return createdStages;
}
