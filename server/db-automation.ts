import { getDb } from "./db";
import { automationRules, automationExecutions } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function getAutomationRules(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(automationRules)
    .where(eq(automationRules.tenantId, tenantId))
    .orderBy(desc(automationRules.createdAt));
}

export async function getAutomationRuleById(ruleId: string) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.id, ruleId))
    .limit(1);

  return results[0] || null;
}

export async function createAutomationRule(data: {
  tenantId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  actionType: string;
  actionConfig?: Record<string, any>;
  conditions?: any;
  priority?: number;
  schedule?: string;
  timezone?: string;
  status?: "active" | "paused";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ruleId = randomUUID();

  await db.insert(automationRules).values({
    id: ruleId,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description || null,
    triggerType: data.triggerType as any,
    triggerConfig: data.triggerConfig || {},
    actionType: data.actionType as any,
    actionConfig: data.actionConfig || {},
    conditions: data.conditions || { logic: 'AND', rules: [] },
    priority: data.priority || 0,
    schedule: data.schedule || null,
    timezone: data.timezone || "UTC",
    status: data.status || "active",
  });

  return ruleId;
}

export async function updateAutomationRule(
  ruleId: string,
  data: {
    name?: string;
    description?: string;
    triggerConfig?: Record<string, any>;
    actionConfig?: Record<string, any>;
    status?: "active" | "paused";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(automationRules)
    .set(data)
    .where(eq(automationRules.id, ruleId));
}

export async function deleteAutomationRule(ruleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(automationRules).where(eq(automationRules.id, ruleId));
}

export async function getAutomationExecutions(tenantId: string, ruleId?: string) {
  const db = await getDb();
  if (!db) return [];

  if (ruleId) {
    return db
      .select()
      .from(automationExecutions)
      .where(
        and(
          eq(automationExecutions.tenantId, tenantId),
          eq(automationExecutions.ruleId, ruleId)
        )
      )
      .orderBy(desc(automationExecutions.executedAt))
      .limit(100);
  }

  return db
    .select()
    .from(automationExecutions)
    .where(eq(automationExecutions.tenantId, tenantId))
    .orderBy(desc(automationExecutions.executedAt))
    .limit(100);
}
