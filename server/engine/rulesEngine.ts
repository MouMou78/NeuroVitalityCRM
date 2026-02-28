/**
 * Rules Engine
 *
 * Evaluates condition expressions against a lead's event history and field
 * values. Supports boolean logic (AND/OR), event window queries, count
 * thresholds, field comparisons, and score thresholds.
 *
 * Condition expression language:
 *   { type: "event_window", event_type, window_ms, min_count? }
 *   { type: "field_compare", field, operator, value }
 *   { type: "score_threshold", operator, value }
 *   { type: "and", conditions: [...] }
 *   { type: "or", conditions: [...] }
 */

import { getEventsInWindow, EventType } from "./eventIngestion";
import { getLeadScore } from "./leadScoring";

export type Operator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";

export type Condition =
  | { type: "event_window"; event_type: EventType; window_ms: number; min_count?: number }
  | { type: "field_compare"; field: string; operator: Operator; value: any }
  | { type: "score_threshold"; operator: Operator; value: number }
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "always_true" };

export interface EvalContext {
  tenant_id: string;
  entity_id: string;
  fields: Record<string, any>;
}

/**
 * Evaluate a condition expression against the given context.
 * Returns true if the condition is satisfied.
 */
export async function evaluateCondition(
  condition: Condition,
  ctx: EvalContext
): Promise<boolean> {
  switch (condition.type) {
    case "always_true":
      return true;

    case "and":
      for (const c of condition.conditions) {
        if (!(await evaluateCondition(c, ctx))) return false;
      }
      return true;

    case "or":
      for (const c of condition.conditions) {
        if (await evaluateCondition(c, ctx)) return true;
      }
      return false;

    case "event_window": {
      const events = await getEventsInWindow(
        ctx.tenant_id,
        ctx.entity_id,
        condition.event_type,
        condition.window_ms
      );
      const count = events.length;
      const minCount = condition.min_count ?? 1;
      return count >= minCount;
    }

    case "field_compare": {
      const fieldValue = ctx.fields[condition.field];
      return compareValues(fieldValue, condition.operator, condition.value);
    }

    case "score_threshold": {
      const score = await getLeadScore(ctx.tenant_id, ctx.entity_id);
      return compareValues(score, condition.operator, condition.value);
    }

    default:
      console.warn("[RulesEngine] Unknown condition type:", (condition as any).type);
      return false;
  }
}

function compareValues(actual: any, operator: Operator, expected: any): boolean {
  switch (operator) {
    case "eq":          return actual === expected;
    case "neq":         return actual !== expected;
    case "gt":          return actual > expected;
    case "gte":         return actual >= expected;
    case "lt":          return actual < expected;
    case "lte":         return actual <= expected;
    case "contains":    return String(actual).includes(String(expected));
    case "not_contains":return !String(actual).includes(String(expected));
    default:            return false;
  }
}
